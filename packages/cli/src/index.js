#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { execa } from 'execa';
import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const program = new Command();
async function streamMetrics(projectId) {
    const interval = setInterval(async () => {
        const cpu = await si.currentLoad();
        const mem = await si.mem();
        await supabase.from('metrics').insert({
            project_id: projectId,
            cpu_usage: cpu.currentLoad,
            ram_usage: mem.active / 1024 / 1024
        });
    }, 3000);
    return interval;
}
program
    .name('orbit')
    .version('1.0.0')
    .description('Orbit PaaS CLI');
program
    .command('deploy')
    .action(async () => {
    console.log(chalk.bold.bgWhite.black(' ORBIT ') + chalk.bold(' Launching Project...\n'));
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'platform',
            message: 'Where do you want to deploy?',
            choices: ['Self-Host (VPS)', 'Vercel', 'Netlify']
        },
        {
            type: 'input',
            name: 'projectName',
            message: 'Project Name:',
            default: path.basename(process.cwd())
        }
    ]);
    // 1. Sync Project with Supabase
    const { data: project } = await supabase
        .from('projects')
        .upsert({ name: answers.projectName, platform: answers.platform.toLowerCase() })
        .select().single();
    const { data: deployRecord } = await supabase
        .from('deployments')
        .insert({ project_id: project.id, status: 'building', logs: 'Build started...' })
        .select().single();
    const metricInterval = await streamMetrics(project.id);
    console.log(chalk.cyan(`🛰️  Orbit is tracking this build at: http://localhost:3000`));
    try {
        let logs = "--- Build Started ---\n";
        const buildProcess = execa('npm', ['run', 'build']);
        buildProcess.stdout?.on('data', async (chunk) => {
            const line = chunk.toString();
            process.stdout.write(chalk.gray(line));
            logs += line;
            await supabase.from('deployments').update({ logs }).eq('id', deployRecord.id);
        });
        await buildProcess;
        if (answers.platform === 'Vercel') {
            console.log(chalk.bold('\n🚀 Pushing to Vercel...'));
            await execa('npx', ['vercel', '--confirm'], { stdio: 'inherit' });
        }
        await supabase.from('projects').update({ status: 'success' }).eq('id', project.id);
        await supabase.from('deployments').update({ status: 'success' }).eq('id', deployRecord.id);
        console.log(chalk.green('\n✅ Project successfully orbited!'));
    }
    catch (err) {
        console.error(chalk.red('\n❌ Deployment failed.'));
        await supabase.from('projects').update({ status: 'failed' }).eq('id', project.id);
    }
    finally {
        clearInterval(metricInterval);
    }
});
program.parse();
//# sourceMappingURL=index.js.map