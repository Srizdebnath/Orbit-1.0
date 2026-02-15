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

// --- CONFIGURATION ---
const ORBIT_URL = "http://localhost:3000"; // Your Next.js App URL
const SUPABASE_URL = "REDACTED_SUPABASE_URL";
const SUPABASE_ANON_KEY = "REDACTED_SUPABASE_ANON_KEY";

const CONFIG_PATH = path.join(os.homedir(), '.orbit_session.json');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getSession() {
  if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  return null;
}

const program = new Command();
program.name('orbit').version('1.0.0');

// --- LOGIN COMMAND ---
program
  .command('login')
  .description('Connect your terminal to Orbit')
  .action(async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    console.log(chalk.bold(`\n🔑 Login Code: `) + chalk.cyan.bold(code));
    
    // 1. Insert handshake request
    await supabase.from('cli_auth').insert({ code });

    const authUrl = `${ORBIT_URL}/auth/cli?code=${code}`;
    console.log(chalk.yellow(`\nOpening your browser to authenticate...`));
    console.log(chalk.gray(`If it doesn't open, visit: ${authUrl}`));
    
    await open(authUrl);

    // 2. Poll for approval
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    process.stdout.write(chalk.cyan('Waiting for approval... '));

    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('cli_auth')
        .select('is_approved, user_id')
        .eq('code', code)
        .single();

      if (data?.is_approved) {
        clearInterval(poll);
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ user_id: data.user_id }));
        console.log(chalk.green('\n\n✅ Successfully authenticated!'));
        process.exit(0);
      }
      process.stdout.write(`\r${spinner[i++ % 4]} Waiting for approval... `);
    }, 2000);
  });

// --- DEPLOY COMMAND ---
program
  .command('deploy')
  .action(async () => {
    const session = getSession();
    if (!session) {
      console.log(chalk.red('❌ Not logged in. Run "orbit login" first.'));
      return;
    }

    console.log(chalk.bold.bgWhite.black(' ORBIT ') + chalk.bold(' Launching Project...\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Where do you want to deploy?',
        choices: ['Vercel', 'Netlify', 'Self-Host (VPS)']
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project Name:',
        default: path.basename(process.cwd())
      }
    ]);

    // 1. Create project linked to user
    const { data: project } = await supabase
      .from('projects')
      .upsert({ 
        name: answers.projectName, 
        platform: answers.platform.toLowerCase(), 
        user_id: session.user_id 
      })
      .select().single();

    // 2. Create Deployment
    const { data: deployRecord } = await supabase
      .from('deployments')
      .insert({ project_id: project.id, status: 'building', logs: 'Build started...' })
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
      let logs = "--- Starting Orbit Build ---\n";
      const buildProcess = execa('npm', ['run', 'build']);

      buildProcess.stdout?.on('data', async (chunk) => {
        logs += chunk.toString();
        await supabase.from('deployments').update({ logs }).eq('id', deployRecord.id);
      });

      await buildProcess;

      if (answers.platform === 'Vercel') {
        await execa('npx', ['vercel', '--confirm'], { stdio: 'inherit' });
      }

      await supabase.from('projects').update({ status: 'success' }).eq('id', project.id);
      console.log(chalk.green('\n✅ Project successfully orbited!'));

    } catch (err) {
      console.error(chalk.red('\n❌ Deployment failed.'));
      await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
    } finally {
      clearInterval(metricInterval);
    }
  });

program.parse();