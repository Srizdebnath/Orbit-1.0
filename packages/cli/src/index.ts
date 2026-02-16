#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import { execa } from 'execa';
import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
import os from 'os';
import open from 'open';
import { spawn } from 'child_process';

const ORBIT_URL = "https://orbit-gamma-seven.vercel.app/"; 
const CONFIG_PATH = path.join(os.homedir(), '.orbit_session.json');
const SUPABASE_URL = "REDACTED_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REDACTED_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function getSession() {
  if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return null;
}

const program = new Command();
program.name('orbit').version('1.0.4');

// --- LOGIN ---
program.command('login').action(async () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  await supabase.from('cli_auth').insert({ code });
  const authUrl = `${ORBIT_URL}/auth/cli?code=${code}`;
  console.log(chalk.bold(`\n🔑 Login Code: `) + chalk.cyan.bold(code));
  await open(authUrl);
  const poll = setInterval(async () => {
    const { data } = await supabase.from('cli_auth').select('is_approved, user_id').eq('code', code).single();
    if (data?.is_approved) {
      clearInterval(poll);
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ user_id: data.user_id }));
      console.log(chalk.green('\n✅ Authenticated!'));
      process.exit(0);
    }
  }, 2000);
});

// --- DEPLOY ---
program.command('deploy').action(async () => {
  const session = getSession();
  if (!session) return console.log(chalk.red('❌ Run "orbit login" first.'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Select Target Platform:',
      choices: [
        { name: 'Vercel', value: 'vercel' },
        { name: 'Netlify', value: 'netlify' },
        { name: 'Laptop Hosting (Tunnel)', value: 'tunnel' },
        { name: 'Self-Host (VPS)', value: 'vps' }
      ]
    },
    {
      type: 'input',
      name: 'projectName',
      message: 'Project Name:',
      default: path.basename(process.cwd())
    }
  ]);

  // 1. Sync Project with Database
  const { data: project, error: pError } = await supabase
    .from('projects')
    .upsert({ 
      name: answers.projectName, 
      platform: answers.platform, 
      user_id: session.user_id,
      status: 'deploying'
    }, { onConflict: 'name,user_id' })
    .select().single();

  if (pError) {
    console.error(chalk.red('\n❌ Database Error:'), pError.message);
    console.log(chalk.yellow('Tip: Ensure you ran the SQL fix in Supabase to allow the "tunnel" platform.'));
    return;
  }

  // 2. Create Deployment Record
  const { data: deployRecord } = await supabase
    .from('deployments')
    .insert({ project_id: project.id, status: 'building', logs: 'Orbit sequence initiated...\n' })
    .select().single();

  // 3. Metrics Streaming
  const metricInterval = setInterval(async () => {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    await supabase.from('metrics').insert({
      project_id: project.id,
      cpu_usage: cpu.currentLoad,
      ram_usage: mem.active / 1024 / 1024
    });
  }, 3000);

  try {
    let logs = "--- Orbit Build Log ---\n";

    // Skip local build for tunnels (host directly)
    if (answers.platform !== 'tunnel') {
        console.log(chalk.blue('🛠️  Running build sequence...'));
        const build = execa('npm', ['run', 'build']);
        build.stdout?.on('data', async (d) => {
          logs += d.toString();
          await supabase.from('deployments').update({ logs }).eq('id', deployRecord.id);
        });
        await build;
    }

    let finalUrl = "";

    if (answers.platform === 'vercel') {
      console.log(chalk.cyan('🚀 Pushing to Vercel...'));
      const { stdout } = await execa('npx', ['vercel', '--confirm', '--prod']);
      const match = stdout.match(/https:\/\/[a-z0-9-]+\.vercel\.app/);
      finalUrl = match ? match[0] : "";
    }

    if (answers.platform === 'netlify') {
      console.log(chalk.cyan('🚀 Pushing to Netlify...'));
      const { stdout } = await execa('npx', ['netlify', 'deploy', '--prod', '--dir=.next']);
      const match = stdout.match(/https:\/\/[a-z0-9-]+\.netlify\.app/);
      finalUrl = match ? match[0] : "";
    }

     if (answers.platform === 'tunnel') {
      const portAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'port',
          message: 'Which port is your app running on?',
          default: '3000'
        }
      ]);

      console.log(chalk.bold.bgBlue.white(' ORBIT TUNNEL ') + ` Bridging port ${portAnswers.port}...`);

      // Start the tunnel
      const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${portAnswers.port}`]);
      
      tunnel.stderr.on('data', async (data) => {
        const output = data.toString();
        // Look for the URL in the logs
        const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        
        if (match) {
          finalUrl = match[0];
          console.log(chalk.green.bold(`\n🌎 YOUR PROJECT IS LIVE AT: `) + chalk.white.underline(finalUrl));
          console.log(chalk.gray(`\nLogs and Metrics are streaming to your Orbit Dashboard.`));
          
          // Update the website link immediately
          await supabase.from('projects').update({ 
            status: 'success', 
            domain: finalUrl 
          }).eq('id', project.id);
        }

        // Send tunnel logs to the dashboard terminal
        logs += output;
        await supabase.from('deployments').update({ logs }).eq('id', deployRecord.id);
      });

      console.log(chalk.yellow(`\n⚠️  IMPORTANT: Make sure your project is running on localhost:${portAnswers.port}`));
      console.log(chalk.cyan(`(Run 'npm run dev' or 'npm start' in another terminal if you haven't yet)\n`));
      
      // Keep process alive
      await new Promise(() => {}); 
    }
    // Update Project Success
    await supabase.from('projects').update({ status: 'success', domain: finalUrl }).eq('id', project.id);
    await supabase.from('deployments').update({ status: 'success' }).eq('id', deployRecord.id);
    console.log(chalk.green('\n✅ Orbit Mission Complete!'));

  } catch (err) {
    console.error(chalk.red('\n❌ Deployment failed:'), err);
    await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
  } finally {
    if (answers.platform !== 'tunnel') clearInterval(metricInterval);
  }
});

program.parse();