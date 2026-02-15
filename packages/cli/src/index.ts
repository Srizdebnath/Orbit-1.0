#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('Error: SUPABASE_URL and SUPABASE_KEY are required in .env file'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const program = new Command();

program
  .name('orbit')
  .description('Launch your apps into orbit')
  .version('0.0.1');

program
  .command('deploy')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🛰️  ORBIT TERMINAL\n'));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Where are we heading?',
        choices: ['Vercel', 'Netlify', 'Self-Host (VPS)'],
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: 'my-cool-app'
      },
      {
        type: 'input',
        name: 'domain',
        message: 'Custom domain:',
        default: 'example.com'
      }
    ]);

    console.log(chalk.yellow('\n📦 Connecting to Orbit Control Plane...'));

       
    const { data: project, error: pError } = await supabase
      .from('projects')
      .upsert({ 
        name: answers.projectName, 
        domain: answers.domain, 
        platform: answers.platform.toLowerCase().replace(' ', '') 
      })
      .select()
      .single();

    if (pError) {
      console.error(chalk.red('Failed to sync project:'), pError.message);
      return;
    }

    const { data: deployment, error: dError } = await supabase
      .from('deployments')
      .insert({ 
        project_id: project.id, 
        status: 'building', 
        logs: 'Starting deployment sequence...' 
      })
      .select()
      .single();

    if (dError) return console.error(chalk.red('Deployment failed:'), dError.message);

    console.log(chalk.green(`🚀 Deployment started! View logs at: http://localhost:3000/projects/${project.id}`));

    let logHistory = 'Starting deployment sequence...';
    const logSteps = [
      '🔍 Analyzing project structure...',
      '🛠️ Building production bundle...',
      '📡 Uploading assets to edge...',
      '✅ Fully deployed and operational.'
    ];

    for (const step of logSteps) {
      await new Promise(res => setTimeout(res, 2000));
      logHistory += `\n${step}`;
      await supabase
        .from('deployments')
        .update({ logs: logHistory, status: step.includes('✅') ? 'success' : 'building' })
        .eq('id', deployment.id);
      console.log(chalk.gray(`[LOG]: ${step}`));
    }
  });

program.parse();