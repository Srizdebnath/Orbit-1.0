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

const ORBIT_URL = "http://localhost:3000"; 
const CONFIG_PATH = path.join(os.homedir(), '.orbit_session.json');
const SUPABASE_URL = "REDACTED_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REDACTED_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
function getSession() {
  if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return null;
}

const program = new Command();
program.name('orbit').version('1.0.1');

program
  .command('login')
  .description('Connect your terminal to Orbit')
  .action(async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(chalk.bold(`\n🔑 Login Code: `) + chalk.cyan.bold(code));
    await supabase.from('cli_auth').insert({ code });
    const authUrl = `${ORBIT_URL}/auth/cli?code=${code}`;
    console.log(chalk.yellow(`\nOpening browser to authenticate...`));
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

program
  .command('deploy')
  .action(async () => {
    const session = getSession();
    if (!session) return console.log(chalk.red('❌ Run "orbit login" first.'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select Target:',
        choices: ['Vercel', 'Netlify', 'Self-Host (VPS)']
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project Name:',
        default: path.basename(process.cwd())
      }
    ]);

    
    const { data: project, error: pError } = await supabase
      .from('projects')
      .upsert({ 
        name: answers.projectName, 
        platform: answers.platform.toLowerCase(), 
        user_id: session.user_id,
        status: 'deploying'
      }, { onConflict: 'name,user_id' })
      .select().single();

    if (pError || !project) {
        console.error(chalk.red('\n❌ Database Error:'), pError?.message || "Project record could not be created.");
        return;
    }

    
    const { data: deployRecord, error: dError } = await supabase
      .from('deployments')
      .insert({ project_id: project.id, status: 'building', logs: 'Build started...\n' })
      .select().single();

    if (dError || !deployRecord) {
        console.error(chalk.red('\n❌ Deployment Record Error:'), dError?.message);
        return;
    }

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
      console.log(chalk.blue('🛠️  Running build check...'));
      let currentLogs = "--- Orbit Build Sequence ---\n";
      
      const build = execa('npm', ['run', 'build']);
      build.stdout?.on('data', async (chunk) => {
        const line = chunk.toString();
        process.stdout.write(chalk.gray(line));
        currentLogs += line;
        await supabase.from('deployments').update({ logs: currentLogs }).eq('id', deployRecord.id);
      });

      await build;

      if (answers.platform === 'Vercel') {
        console.log(chalk.cyan('\n🚀 Pushing to Vercel...'));
        await execa('npx', ['vercel', '--confirm'], { stdio: 'inherit' });
      }

      await supabase.from('projects').update({ status: 'success' }).eq('id', project.id);
      await supabase.from('deployments').update({ status: 'success' }).eq('id', deployRecord.id);
      console.log(chalk.green('\n✅ Project successfully orbited!'));

    } catch (err) {
      console.error(chalk.red('\n❌ Build/Deploy failed. Check logs on dashboard.'));
      await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
    } finally {
      clearInterval(metricInterval);
    }
  });

  program
  .command('tunnel')
  .description('Expose your local port to the internet')
  .argument('<port>', 'Local port to expose')
  .action(async (port) => {
    console.log(chalk.bold.bgBlue.white(' ORBIT TUNNEL ') + ` Starting on port ${port}...`);
    
    
    const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`]);

    tunnel.stdout.on('data', (data) => {
      const output = data.toString();
      const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (urlMatch) {
        console.log(chalk.green.bold(`\n🌎 Your Orbit is live at: ${urlMatch[0]}`));
        console.log(chalk.gray('Logs are being streamed to your dashboard...'));
      }
    });

    tunnel.stderr.on('data', (data) => {
        const output = data.toString();
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch) console.log(chalk.green.bold(`\n🌎 Live Link: ${urlMatch[0]}`));
    });
  });

program.parse();