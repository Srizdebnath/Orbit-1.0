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
import net from 'net';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { ORBIT_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { deployToVPS, testSSHConnection } from './engine.js';

const VERSION = "1.2.0";
const LOGIN_TIMEOUT_MS = 120_000; // 2 minutes
const CONFIG_PATH = path.join(os.homedir(), '.orbit_session.json');
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSession() {
  if (fs.existsSync(CONFIG_PATH)) {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); }
    catch { return null; }
  }
  return null;
}

function hasPackageJson(): boolean {
  return fs.existsSync(path.join(process.cwd(), 'package.json'));
}

function isPortReachable(port: number, host = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execa('which', [cmd]);
    return true;
  } catch {
    return false;
  }
}

function detectOutputDir(): string {
  if (fs.existsSync(path.join(process.cwd(), '.next'))) return '.next';
  if (fs.existsSync(path.join(process.cwd(), 'dist'))) return 'dist';
  if (fs.existsSync(path.join(process.cwd(), 'build'))) return 'build';
  if (fs.existsSync(path.join(process.cwd(), 'out'))) return 'out';
  return '.next'; // default fallback
}

function banner(text: string) {
  console.log(chalk.bold.bgBlue.white(` ${text} `));
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

async function resolveProject(session: any, projectNameOpt?: string): Promise<any | null> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', session.user_id)
    .order('created_at', { ascending: false });

  if (error || !projects || projects.length === 0) {
    console.log(chalk.yellow('⚠️  No projects found.'));
    return null;
  }

  if (projectNameOpt) {
    const found = projects.find((p: any) => p.name.toLowerCase() === projectNameOpt.toLowerCase());
    if (!found) {
      console.log(chalk.red(`❌ No project named "${projectNameOpt}" found.`));
      console.log(chalk.gray('   Available: ') + projects.map((p: any) => chalk.cyan(p.name)).join(', '));
      return null;
    }
    return found;
  }

  const { selectedProject } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedProject',
    message: 'Select a project:',
    choices: projects.map((p: any) => ({
      name: `${p.name}  ${chalk.gray(`(${p.platform})`)}  ${p.status === 'success' ? chalk.green('● Live') : chalk.gray(`○ ${p.status}`)}`,
      value: p.id
    }))
  }]);
  return projects.find((p: any) => p.id === selectedProject);
}

function requireSession(): any {
  const session = getSession();
  if (!session) {
    console.log(chalk.red('❌ Not logged in. Run ') + chalk.cyan('orbit login') + chalk.red(' first.'));
    return null;
  }
  return session;
}

// ─── Program ─────────────────────────────────────────────────────────────────

const program = new Command();
program
  .name('orbit')
  .version(VERSION)
  .description('Deploy anywhere from your terminal. Powered by Orbit.');

// ─── LOGIN ───────────────────────────────────────────────────────────────────

program.command('login')
  .description('Authenticate your terminal with the Orbit Dashboard')
  .action(async () => {
    const existing = getSession();
    if (existing) {
      const { overwrite } = await inquirer.prompt([{
        type: 'confirm',
        name: 'overwrite',
        message: 'You are already logged in. Re-authenticate?',
        default: false
      }]);
      if (!overwrite) return;
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from('cli_auth').insert({ code });
    if (error) return console.error(chalk.red('❌ Could not initiate auth:'), error.message);

    const authUrl = `${ORBIT_URL}/auth/cli?code=${code}`;
    console.log(chalk.bold(`\n🔑 Login Code: `) + chalk.cyan.bold(code));
    console.log(chalk.gray(`   Opening browser...\n`));
    await open(authUrl);

    console.log(chalk.gray(`   Waiting for approval (${LOGIN_TIMEOUT_MS / 1000}s timeout)...`));

    const start = Date.now();
    const poll = setInterval(async () => {
      if (Date.now() - start > LOGIN_TIMEOUT_MS) {
        clearInterval(poll);
        console.error(chalk.red('\n❌ Login timed out. Please run "orbit login" again.'));
        process.exit(1);
      }
      const { data } = await supabase.from('cli_auth').select('is_approved, user_id').eq('code', code).single();
      if (data?.is_approved) {
        clearInterval(poll);
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ user_id: data.user_id }));
        console.log(chalk.green('\n✅ Authenticated! You can now run ') + chalk.cyan.bold('orbit deploy'));
        process.exit(0);
      }
    }, 2000);
  });

// ─── LOGOUT ──────────────────────────────────────────────────────────────────

program.command('logout')
  .description('Remove your local Orbit session')
  .action(() => {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
      console.log(chalk.green('✅ Logged out. Session cleared.'));
    } else {
      console.log(chalk.yellow('⚠️  No active session found.'));
    }
  });

// ─── STATUS ──────────────────────────────────────────────────────────────────

program.command('status')
  .description('View the status of all your Orbit projects')
  .option('-p, --project <name>', 'Filter by project name')
  .action(async (opts) => {
    const session = getSession();
    if (!session) return console.log(chalk.red('❌ Not logged in. Run ') + chalk.cyan('orbit login') + chalk.red(' first.'));

    console.log(chalk.gray('\n📡 Fetching projects from Orbit Dashboard...\n'));

    let query = supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (opts.project) {
      query = query.ilike('name', `%${opts.project}%`);
    }

    const { data: projects, error } = await query;

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!projects || projects.length === 0) {
      console.log(chalk.yellow('⚠️  No projects found.'));
      console.log(chalk.gray('   Deploy your first project with ') + chalk.cyan('orbit deploy'));
      return;
    }

    // Fetch latest deployment for each project
    const projectIds = projects.map((p: any) => p.id);
    const { data: deployments } = await supabase
      .from('deployments')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    // Group latest deployment per project
    const latestDeploy: Record<string, any> = {};
    const deployCount: Record<string, number> = {};
    if (deployments) {
      for (const d of deployments) {
        deployCount[d.project_id] = (deployCount[d.project_id] || 0) + 1;
        if (!latestDeploy[d.project_id]) {
          latestDeploy[d.project_id] = d;
        }
      }
    }

    // Status icon mapping
    const statusIcon = (s: string) => {
      switch (s) {
        case 'success': return chalk.green('● Live');
        case 'deploying':
        case 'building': return chalk.yellow('◐ Building');
        case 'failed': return chalk.red('✖ Failed');
        case 'idle': return chalk.gray('○ Idle');
        default: return chalk.gray(`○ ${s}`);
      }
    };

    const platformIcon = (p: string) => {
      switch (p) {
        case 'vercel': return '▲ Vercel';
        case 'netlify': return '◆ Netlify';
        case 'tunnel': return '⚡ Tunnel';
        case 'vps': return '🖥  VPS';
        default: return p;
      }
    };

    // Header
    banner('ORBIT STATUS');
    console.log('');

    for (const project of projects) {
      const deploy = latestDeploy[project.id];
      const count = deployCount[project.id] || 0;
      const lastDeployed = deploy ? timeAgo(new Date(deploy.created_at)) : 'never';

      console.log(chalk.bold.white(`  ${project.name}`));
      console.log(chalk.gray(`  ├─ Platform   : `) + chalk.cyan(platformIcon(project.platform)));
      console.log(chalk.gray(`  ├─ Status     : `) + statusIcon(project.status));
      console.log(chalk.gray(`  ├─ Domain     : `) + (project.domain ? chalk.underline(project.domain) : chalk.gray('—')));
      console.log(chalk.gray(`  ├─ Deploys    : `) + chalk.white(`${count}`));
      console.log(chalk.gray(`  └─ Last Deploy: `) + chalk.white(lastDeployed));
      console.log('');
    }

    console.log(chalk.gray(`  Total: ${projects.length} project(s)\n`));
  });

// ─── ROLLBACK ────────────────────────────────────────────────────────────────

program.command('rollback')
  .description('Rollback a project to a previous deployment')
  .option('-p, --project <name>', 'Specify project by name')
  .action(async (opts) => {
    const session = getSession();
    if (!session) return console.log(chalk.red('❌ Not logged in. Run ') + chalk.cyan('orbit login') + chalk.red(' first.'));

    console.log(chalk.gray('\n📡 Fetching your projects...\n'));

    // ── 1. Select project ─────────────────────────────────────────────────
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (pErr) return console.error(chalk.red('❌ Error:'), pErr.message);
    if (!projects || projects.length === 0) {
      return console.log(chalk.yellow('⚠️  No projects found.'));
    }

    let targetProject: any;

    if (opts.project) {
      targetProject = projects.find((p: any) => p.name.toLowerCase() === opts.project.toLowerCase());
      if (!targetProject) {
        console.log(chalk.red(`❌ No project named "${opts.project}" found.`));
        console.log(chalk.gray('   Available projects: ') + projects.map((p: any) => chalk.cyan(p.name)).join(', '));
        return;
      }
    } else {
      const { selectedProject } = await inquirer.prompt([{
        type: 'list',
        name: 'selectedProject',
        message: 'Select a project to rollback:',
        choices: projects.map((p: any) => ({
          name: `${p.name}  ${chalk.gray(`(${p.platform})`)}  ${p.status === 'success' ? chalk.green('● Live') : chalk.gray(`○ ${p.status}`)}`,
          value: p.id
        }))
      }]);
      targetProject = projects.find((p: any) => p.id === selectedProject);
    }

    // ── 2. Fetch deployment history ───────────────────────────────────────
    console.log(chalk.gray(`\n📋 Loading deployment history for ${chalk.white(targetProject.name)}...\n`));

    const { data: deployments, error: dErr } = await supabase
      .from('deployments')
      .select('*')
      .eq('project_id', targetProject.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (dErr) return console.error(chalk.red('❌ Error:'), dErr.message);
    if (!deployments || deployments.length === 0) {
      return console.log(chalk.yellow('⚠️  No deployments found for this project.'));
    }

    if (deployments.length < 2) {
      return console.log(chalk.yellow('⚠️  Only 1 deployment exists — nothing to rollback to.'));
    }

    // ── 3. Let user pick a deployment to rollback to ──────────────────────
    const currentDeploy = deployments[0];
    const olderDeploys = deployments.slice(1);

    console.log(chalk.bold('  Current deployment:'));
    console.log(chalk.gray(`  └─ #${currentDeploy.id.slice(0, 8)}  ${currentDeploy.status === 'success' ? chalk.green('● success') : chalk.red(`✖ ${currentDeploy.status}`)}  ${timeAgo(new Date(currentDeploy.created_at))}\n`));

    const { targetDeploy } = await inquirer.prompt([{
      type: 'list',
      name: 'targetDeploy',
      message: 'Rollback to which deployment?',
      choices: olderDeploys.map((d: any, i: number) => ({
        name: `#${d.id.slice(0, 8)}  ${d.status === 'success' ? chalk.green('● success') : d.status === 'failed' ? chalk.red('✖ failed') : chalk.gray(`○ ${d.status}`)}  ${timeAgo(new Date(d.created_at))}`,
        value: d.id
      }))
    }]);

    const rollbackTarget = deployments.find((d: any) => d.id === targetDeploy);

    // ── 4. Confirm ────────────────────────────────────────────────────────
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: `Rollback ${chalk.bold(targetProject.name)} to deployment #${targetDeploy.slice(0, 8)}?`,
      default: false
    }]);

    if (!confirm) return console.log(chalk.yellow('\n⏹  Rollback cancelled.\n'));

    // ── 5. Execute rollback ───────────────────────────────────────────────
    banner('ROLLBACK');
    console.log(chalk.blue(`\n🔄 Rolling back ${targetProject.name}...\n`));

    // For Vercel & Netlify, rollback is platform-specific
    if (targetProject.platform === 'vercel') {
      console.log(chalk.gray('  📡 Promoting previous Vercel deployment...'));
      try {
        // Vercel stores the deployment URL — we can use vercel promote
        await execa('npx', ['vercel', 'rollback', '--yes'], { stdio: 'inherit' });
        console.log(chalk.green('\n  ✅ Vercel rollback triggered.'));
      } catch (err: any) {
        console.error(chalk.red('\n  ❌ Vercel rollback failed:'), err.message);
        console.log(chalk.yellow('     You may need to rollback manually from the Vercel dashboard.'));
      }
    } else if (targetProject.platform === 'netlify') {
      console.log(chalk.gray('  📡 Restoring previous Netlify deployment...'));
      try {
        await execa('npx', ['netlify', 'api', 'restoreSiteDeploy', '--data', `{"deploy_id": "${targetDeploy}"}`], { stdio: 'inherit' });
        console.log(chalk.green('\n  ✅ Netlify rollback triggered.'));
      } catch (err: any) {
        console.error(chalk.red('\n  ❌ Netlify rollback failed:'), err.message);
        console.log(chalk.yellow('     You may need to rollback manually from the Netlify dashboard.'));
      }
    } else if (targetProject.platform === 'vps') {
      console.log(chalk.yellow('  ⚠️  VPS rollback requires re-deploying from a previous commit.'));
      console.log(chalk.gray('     Check out the target commit with git and run ') + chalk.cyan('orbit deploy') + chalk.gray(' again.'));
    } else if (targetProject.platform === 'tunnel') {
      console.log(chalk.yellow('  ⚠️  Tunnel deployments are ephemeral — there is nothing to rollback.'));
      console.log(chalk.gray('     Simply restart your server and run ') + chalk.cyan('orbit deploy') + chalk.gray(' with the tunnel option.'));
    }

    // ── 6. Update database state ──────────────────────────────────────────
    console.log(chalk.gray('\n  📡 Updating Orbit Dashboard...'));

    // Create a rollback deployment record
    const rollbackLogs = `─── Orbit Rollback Log ───\nTimestamp : ${new Date().toISOString()}\nProject   : ${targetProject.name}\nPlatform  : ${targetProject.platform}\nRolled back to deployment: #${targetDeploy.slice(0, 8)}\n${'─'.repeat(40)}\n\n✅ Rollback complete.\n`;

    await supabase.from('deployments').insert({
      project_id: targetProject.id,
      status: 'success',
      logs: rollbackLogs
    });

    // Restore project status from the target deployment
    const updateData: any = { status: rollbackTarget?.status === 'success' ? 'success' : 'idle' };
    await supabase.from('projects').update(updateData).eq('id', targetProject.id);

    console.log(chalk.green('\n  ✅ Dashboard updated.'));
    console.log('');
    banner('ROLLBACK COMPLETE');
    console.log(chalk.green(`\n✅ ${targetProject.name} rolled back to deployment #${targetDeploy.slice(0, 8)}\n`));
  });

// ─── ENV ─────────────────────────────────────────────────────────────────────

const envCmd = program.command('env').description('Manage environment variables for your projects');

envCmd.command('set <pairs...>')
  .description('Set environment variables (KEY=VALUE ...)')
  .option('-p, --project <name>', 'Project name')
  .action(async (pairs: string[], opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    console.log(chalk.gray(`\n🔐 Setting env vars for ${chalk.white(project.name)}...\n`));

    let successCount = 0;
    for (const pair of pairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) {
        console.log(chalk.red(`  ✖ Invalid format: ${pair}  (use KEY=VALUE)`));
        continue;
      }
      const key = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();

      if (!key) {
        console.log(chalk.red(`  ✖ Empty key in: ${pair}`));
        continue;
      }

      const { error } = await supabase
        .from('env_variables')
        .upsert({ project_id: project.id, key, value, updated_at: new Date().toISOString() },
          { onConflict: 'project_id,key' });

      if (error) {
        console.log(chalk.red(`  ✖ ${key}: ${error.message}`));
      } else {
        console.log(chalk.green(`  ✔ ${key}`) + chalk.gray(` = ${value.length > 40 ? value.slice(0, 40) + '...' : value}`));
        successCount++;
      }
    }

    console.log(chalk.gray(`\n  ${successCount}/${pairs.length} variables set.\n`));
  });

envCmd.command('list')
  .description('List all environment variables for a project')
  .option('-p, --project <name>', 'Project name')
  .option('--show-values', 'Show values (default: masked)')
  .action(async (opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    const { data: vars, error } = await supabase
      .from('env_variables')
      .select('*')
      .eq('project_id', project.id)
      .order('key', { ascending: true });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);

    if (!vars || vars.length === 0) {
      console.log(chalk.yellow(`\n⚠️  No env vars found for ${project.name}.`));
      console.log(chalk.gray(`   Set them with: orbit env set KEY=VALUE -p ${project.name}\n`));
      return;
    }

    banner(`ENV — ${project.name.toUpperCase()}`);
    console.log('');

    for (const v of vars) {
      const maskedValue = opts.showValues ? v.value : '•'.repeat(Math.min(v.value.length, 24));
      console.log(chalk.cyan(`  ${v.key}`) + chalk.gray(' = ') + chalk.white(maskedValue));
    }

    console.log(chalk.gray(`\n  ${vars.length} variable(s)\n`));
  });

envCmd.command('rm <keys...>')
  .description('Remove environment variables')
  .option('-p, --project <name>', 'Project name')
  .action(async (keys: string[], opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    console.log(chalk.gray(`\n🗑  Removing env vars from ${chalk.white(project.name)}...\n`));

    for (const key of keys) {
      const { error } = await supabase
        .from('env_variables')
        .delete()
        .eq('project_id', project.id)
        .eq('key', key);

      if (error) {
        console.log(chalk.red(`  ✖ ${key}: ${error.message}`));
      } else {
        console.log(chalk.green(`  ✔ ${key} removed`));
      }
    }
    console.log('');
  });

envCmd.command('pull')
  .description('Download env vars to a local .env file')
  .option('-p, --project <name>', 'Project name')
  .option('-o, --output <file>', 'Output file', '.env')
  .action(async (opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    const { data: vars, error } = await supabase
      .from('env_variables')
      .select('*')
      .eq('project_id', project.id)
      .order('key', { ascending: true });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!vars || vars.length === 0) return console.log(chalk.yellow('⚠️  No env vars to pull.'));

    const envContent = `# Orbit env vars for: ${project.name}\n# Pulled at: ${new Date().toISOString()}\n\n` +
      vars.map((v: any) => `${v.key}=${v.value}`).join('\n') + '\n';

    const outPath = path.resolve(process.cwd(), opts.output);
    fs.writeFileSync(outPath, envContent);
    console.log(chalk.green(`\n✅ ${vars.length} variable(s) written to ${chalk.underline(outPath)}\n`));
  });

// ─── LOGS ────────────────────────────────────────────────────────────────────

program.command('logs')
  .description('View deployment logs (use -f to follow live)')
  .option('-p, --project <name>', 'Project name')
  .option('-f, --follow', 'Follow live log updates in real-time')
  .option('-n, --lines <count>', 'Number of recent deployments to show', '1')
  .action(async (opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    const limit = parseInt(opts.lines) || 1;

    // Fetch recent deployments
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!deployments || deployments.length === 0) {
      return console.log(chalk.yellow('⚠️  No deployments found.'));
    }

    // Print existing logs
    for (const d of deployments.reverse()) {
      console.log(chalk.gray(`\n─── Deployment #${d.id.slice(0, 8)} — ${d.status} — ${new Date(d.created_at).toLocaleString()} ───\n`));
      console.log(d.logs || chalk.gray('(no logs)'));
    }

    // Follow mode — subscribe to realtime updates
    if (opts.follow) {
      console.log(chalk.cyan('\n📡 Following live logs... (Ctrl+C to stop)\n'));
      let lastLogs = deployments[deployments.length - 1]?.logs || '';

      const channel = supabase
        .channel(`cli-logs-${project.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'deployments', filter: `project_id=eq.${project.id}` },
          (payload: any) => {
            const newLogs: string = payload.new.logs || '';
            // Only print the delta
            if (newLogs.length > lastLogs.length) {
              process.stdout.write(newLogs.slice(lastLogs.length));
            }
            lastLogs = newLogs;

            // Stop following if deployment completed
            if (payload.new.status === 'success' || payload.new.status === 'failed') {
              console.log(chalk.gray(`\n\n─── Deployment ${payload.new.status === 'success' ? chalk.green('succeeded') : chalk.red('failed')} ───`));
              supabase.removeChannel(channel);
              process.exit(0);
            }
          }
        )
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'deployments', filter: `project_id=eq.${project.id}` },
          (payload: any) => {
            console.log(chalk.cyan(`\n📦 New deployment started: #${payload.new.id.slice(0, 8)}`));
            lastLogs = '';
          }
        )
        .subscribe();

      // Keep process alive
      process.on('SIGINT', () => {
        supabase.removeChannel(channel);
        console.log(chalk.gray('\n⏹  Stopped following logs.'));
        process.exit(0);
      });

      await new Promise(() => { });
    }
  });

// ─── TOKEN ───────────────────────────────────────────────────────────────────

const tokenCmd = program.command('token').description('Manage API keys for CI/CD pipelines');

tokenCmd.command('create')
  .description('Generate a new API key')
  .option('-n, --name <name>', 'Key name', 'default')
  .option('--expires <days>', 'Expiry in days (0 = never)', '0')
  .action(async (opts) => {
    const session = requireSession();
    if (!session) return;

    // Generate a secure random API key
    const rawKey = `orb_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = opts.expires && parseInt(opts.expires) > 0
      ? new Date(Date.now() + parseInt(opts.expires) * 86400000).toISOString()
      : null;

    const { error } = await supabase.from('api_keys').insert({
      user_id: session.user_id,
      name: opts.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      expires_at: expiresAt
    });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);

    banner('API KEY CREATED');
    console.log('');
    console.log(chalk.yellow('  ⚠️  Copy this key now — it will NOT be shown again!'));
    console.log('');
    console.log(chalk.bold('  Key:     ') + chalk.green(rawKey));
    console.log(chalk.bold('  Name:    ') + chalk.white(opts.name));
    console.log(chalk.bold('  Prefix:  ') + chalk.gray(keyPrefix));
    console.log(chalk.bold('  Expires: ') + chalk.white(expiresAt ? new Date(expiresAt).toLocaleDateString() : 'Never'));
    console.log('');
    console.log(chalk.gray('  Usage in CI/CD:'));
    console.log(chalk.cyan(`    export ORBIT_TOKEN="${rawKey}"`));
    console.log(chalk.cyan('    orbit deploy --token $ORBIT_TOKEN'));
    console.log('');
  });

tokenCmd.command('list')
  .description('List all API keys')
  .action(async () => {
    const session = requireSession();
    if (!session) return;

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!keys || keys.length === 0) {
      console.log(chalk.yellow('\n⚠️  No API keys found.'));
      console.log(chalk.gray('   Create one with: orbit token create\n'));
      return;
    }

    banner('API KEYS');
    console.log('');

    for (const k of keys) {
      const expired = k.expires_at && new Date(k.expires_at) < new Date();
      const statusStr = expired ? chalk.red('✖ Expired') : chalk.green('● Active');
      const lastUsed = k.last_used_at ? timeAgo(new Date(k.last_used_at)) : 'never';

      console.log(chalk.bold(`  ${k.name}`) + chalk.gray(` (${k.key_prefix}...)  `) + statusStr);
      console.log(chalk.gray(`  ├─ Created : ${timeAgo(new Date(k.created_at))}`));
      console.log(chalk.gray(`  ├─ Expires : ${k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}`));
      console.log(chalk.gray(`  └─ Last Use: ${lastUsed}`));
      console.log('');
    }
  });

tokenCmd.command('revoke')
  .description('Revoke an API key')
  .action(async () => {
    const session = requireSession();
    if (!session) return;

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!keys || keys.length === 0) return console.log(chalk.yellow('⚠️  No API keys found.'));

    const { keyId } = await inquirer.prompt([{
      type: 'list',
      name: 'keyId',
      message: 'Select a key to revoke:',
      choices: keys.map((k: any) => ({
        name: `${k.name}  ${chalk.gray(`(${k.key_prefix}...)`)}  ${chalk.gray(timeAgo(new Date(k.created_at)))}`,
        value: k.id
      }))
    }]);

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure? This cannot be undone.',
      default: false
    }]);

    if (!confirm) return console.log(chalk.yellow('⏹  Cancelled.'));

    const { error: delError } = await supabase.from('api_keys').delete().eq('id', keyId);
    if (delError) return console.error(chalk.red('❌ Error:'), delError.message);

    console.log(chalk.green('\n✅ API key revoked.\n'));
  });

// ─── DOMAINS ─────────────────────────────────────────────────────────────────

const domainsCmd = program.command('domains').description('Manage custom domains for your projects');

domainsCmd.command('add <domain>')
  .description('Add a custom domain to a project')
  .option('-p, --project <name>', 'Project name')
  .action(async (domain: string, opts) => {
    const session = requireSession();
    if (!session) return;

    const project = await resolveProject(session, opts.project);
    if (!project) return;

    // Validate domain format
    const domainRegex = /^([a-z0-9-]+\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return console.log(chalk.red('❌ Invalid domain format. Example: app.example.com'));
    }

    console.log(chalk.gray(`\n🌐 Adding ${chalk.white(domain)} to ${chalk.white(project.name)}...\n`));

    const { error } = await supabase.from('custom_domains').insert({
      project_id: project.id,
      domain,
      ssl_status: 'pending',
      verified: false
    });

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return console.log(chalk.yellow('⚠️  This domain is already registered.'));
      }
      return console.error(chalk.red('❌ Error:'), error.message);
    }

    banner('DOMAIN ADDED');
    console.log('');
    console.log(chalk.green(`  ✔ ${domain} → ${project.name}`));
    console.log('');
    console.log(chalk.bold('  Next Steps:'));
    console.log(chalk.gray('  1. Add a DNS record pointing to your deployment:'));
    if (project.platform === 'vercel') {
      console.log(chalk.cyan('     CNAME  →  cname.vercel-dns.com'));
    } else if (project.platform === 'netlify') {
      console.log(chalk.cyan('     CNAME  →  your-site.netlify.app'));
    } else if (project.platform === 'vps') {
      console.log(chalk.cyan(`     A      →  (your VPS IP address)`));
      console.log(chalk.gray('  2. Caddy will auto-provision SSL on next deploy.'));
    } else {
      console.log(chalk.gray('     Point your DNS to the tunnel/deployment URL'));
    }
    console.log('');
  });

domainsCmd.command('list')
  .description('List all custom domains')
  .option('-p, --project <name>', 'Filter by project name')
  .action(async (opts) => {
    const session = requireSession();
    if (!session) return;

    // Get all projects for this user
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user_id);

    if (!projects || projects.length === 0) return console.log(chalk.yellow('⚠️  No projects found.'));

    const projectIds = opts.project
      ? projects.filter((p: any) => p.name.toLowerCase() === opts.project.toLowerCase()).map((p: any) => p.id)
      : projects.map((p: any) => p.id);

    if (projectIds.length === 0) return console.log(chalk.red(`❌ No project named "${opts.project}".`));

    const { data: domains, error } = await supabase
      .from('custom_domains')
      .select('*')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    if (error) return console.error(chalk.red('❌ Error:'), error.message);
    if (!domains || domains.length === 0) {
      console.log(chalk.yellow('\n⚠️  No custom domains configured.'));
      console.log(chalk.gray('   Add one with: orbit domains add mydomain.com\n'));
      return;
    }

    banner('CUSTOM DOMAINS');
    console.log('');

    for (const d of domains) {
      const proj = projects.find((p: any) => p.id === d.project_id);
      const sslIcon = d.ssl_status === 'active' ? chalk.green('🔒') : d.ssl_status === 'failed' ? chalk.red('🔓') : chalk.yellow('⏳');
      const verifiedIcon = d.verified ? chalk.green('✔') : chalk.yellow('?');

      console.log(chalk.bold(`  ${d.domain}`) + chalk.gray(`  → ${proj?.name || 'unknown'}`));
      console.log(chalk.gray(`  ├─ SSL     : ${sslIcon} ${d.ssl_status}`));
      console.log(chalk.gray(`  ├─ Verified: ${verifiedIcon} ${d.verified ? 'Yes' : 'Pending'}`));
      console.log(chalk.gray(`  └─ Added   : ${timeAgo(new Date(d.created_at))}`));
      console.log('');
    }
  });

domainsCmd.command('rm <domain>')
  .description('Remove a custom domain')
  .action(async (domain: string) => {
    const session = requireSession();
    if (!session) return;

    // Verify ownership through project
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', session.user_id);

    if (!projects || projects.length === 0) return console.log(chalk.yellow('⚠️  No projects found.'));

    const { error } = await supabase
      .from('custom_domains')
      .delete()
      .eq('domain', domain)
      .in('project_id', projects.map((p: any) => p.id));

    if (error) return console.error(chalk.red('❌ Error:'), error.message);

    console.log(chalk.green(`\n✅ Domain ${domain} removed.\n`));
  });

// ─── DEPLOY ──────────────────────────────────────────────────────────────────

program.command('deploy')
  .description('Build, deploy, and stream telemetry for your project')
  .action(async () => {
    // ── 1. Session Check ─────────────────────────────────────────────────
    const session = getSession();
    if (!session) {
      console.log(chalk.red('❌ Not logged in.'));
      const { doLogin } = await inquirer.prompt([{
        type: 'confirm', name: 'doLogin', message: 'Would you like to login now?', default: true
      }]);
      if (doLogin) {
        await execa('node', [process.argv[1], 'login'], { stdio: 'inherit' });
        const newSession = getSession();
        if (!newSession) return;
      } else { return; }
    }

    const activeSession = getSession();
    if (!activeSession) return console.log(chalk.red('❌ Login required.'));

    // ── 2. Project Check ─────────────────────────────────────────────────
    if (!hasPackageJson()) {
      console.error(chalk.red('\n❌ No package.json found in current directory.'));
      console.log(chalk.yellow(`   Run this command from the root of your project.\n`));
      console.log(chalk.gray(`   Current directory: ${process.cwd()}`));
      return;
    }

    // ── 3. Platform Selection ────────────────────────────────────────────
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select Target Platform:',
        choices: [
          { name: '▲  Vercel         — Serverless Edge', value: 'vercel' },
          { name: '◆  Netlify        — JAMstack CDN', value: 'netlify' },
          { name: '⚡ Laptop Tunnel  — Cloudflare Tunnel', value: 'tunnel' },
          { name: '🖥  Self-Host VPS  — Docker + Caddy', value: 'vps' }
        ]
      },
      {
        type: 'input',
        name: 'projectName',
        message: 'Project Name:',
        default: path.basename(process.cwd()),
        validate: (v: string) => v.trim().length > 0 || 'Project name cannot be empty'
      }
    ]);

    // ── 4. Pre-flight Platform Auth ──────────────────────────────────────
    const preflight = await runPreflight(answers.platform);
    if (!preflight.ok) return;

    // ── 5. Collect platform-specific config ──────────────────────────────
    let vpsConfig: any = null;
    let tunnelPort = '3000';

    if (answers.platform === 'vps') {
      vpsConfig = await inquirer.prompt([
        { type: 'input', name: 'host', message: 'VPS IP / Hostname:', validate: (v: string) => v.trim().length > 0 || 'Required' },
        { type: 'input', name: 'username', message: 'SSH Username:', default: 'root' },
        {
          type: 'input', name: 'keyPath', message: 'Path to SSH private key:', default: path.join(os.homedir(), '.ssh', 'id_rsa'),
          validate: (v: string) => fs.existsSync(v) || `File not found: ${v}`
        },
        { type: 'input', name: 'domain', message: 'Domain (or "none" to skip Caddy):', default: 'none' },
        { type: 'input', name: 'port', message: 'Port to expose:', default: '3000' }
      ]);

      // Test SSH connection before proceeding
      console.log(chalk.gray('\n🔍 Testing SSH connection...'));
      const privateKey = fs.readFileSync(vpsConfig.keyPath, 'utf-8');
      const canConnect = await testSSHConnection(vpsConfig.host, vpsConfig.username, privateKey);
      if (!canConnect) {
        console.error(chalk.red(`\n❌ Cannot connect to ${vpsConfig.host} via SSH.`));
        console.log(chalk.yellow('   Check your IP, username, and private key, then try again.'));
        return;
      }
      console.log(chalk.green('✅ SSH connection verified.\n'));
    }

    if (answers.platform === 'tunnel') {
      const portAnswers = await inquirer.prompt([{
        type: 'input', name: 'port', message: 'Which port is your app running on?', default: '3000',
        validate: (v: string) => {
          const n = parseInt(v);
          return (n > 0 && n < 65536) || 'Enter a valid port number (1-65535)';
        }
      }]);
      tunnelPort = portAnswers.port;

      // Check if port is actually reachable
      console.log(chalk.gray(`\n🔍 Checking if localhost:${tunnelPort} is reachable...`));
      const reachable = await isPortReachable(parseInt(tunnelPort));
      if (!reachable) {
        console.log(chalk.yellow(`\n⚠️  Nothing is running on localhost:${tunnelPort}.`));
        const { proceed } = await inquirer.prompt([{
          type: 'confirm', name: 'proceed',
          message: `Continue anyway? (Make sure to start your app on port ${tunnelPort})`,
          default: true
        }]);
        if (!proceed) return;
      } else {
        console.log(chalk.green(`✅ Port ${tunnelPort} is active.\n`));
      }
    }

    // ── 6. Sync with Database ────────────────────────────────────────────
    console.log(chalk.gray('📡 Syncing with Orbit Dashboard...'));

    const { data: project, error: pError } = await supabase
      .from('projects')
      .upsert({
        name: answers.projectName,
        platform: answers.platform,
        user_id: activeSession.user_id,
        status: 'deploying'
      }, { onConflict: 'name,user_id' })
      .select().single();

    if (pError) {
      console.error(chalk.red('\n❌ Database Error:'), pError.message);
      return;
    }

    const { data: deployRecord, error: dError } = await supabase
      .from('deployments')
      .insert({ project_id: project.id, status: 'building', logs: 'Orbit sequence initiated...\n' })
      .select().single();

    if (dError) {
      console.error(chalk.red('\n❌ Deployment Record Error:'), dError.message);
      return;
    }

    // ── 7. Telemetry & Cleanup ───────────────────────────────────────────
    let metricInterval: ReturnType<typeof setInterval>;
    const timestamp = new Date().toISOString();
    let logs = `─── Orbit Build Log ───\nTimestamp : ${timestamp}\nProject   : ${answers.projectName}\nPlatform  : ${answers.platform}\nDirectory : ${process.cwd()}\n${'─'.repeat(40)}\n\n`;

    const startMetrics = () => {
      metricInterval = setInterval(async () => {
        try {
          const cpu = await si.currentLoad();
          const mem = await si.mem();
          await supabase.from('metrics').insert({
            project_id: project.id,
            cpu_usage: cpu.currentLoad,
            ram_usage: mem.active / 1024 / 1024
          });
        } catch { /* silently ignore metric errors */ }
      }, 3000);
    };

    const appendLog = async (text: string) => {
      logs += text;
      try { await supabase.from('deployments').update({ logs }).eq('id', deployRecord.id); } catch { /* ignore */ }
    };

    const cleanup = async (status: string) => {
      clearInterval(metricInterval);
      try { await supabase.from('projects').update({ status }).eq('id', project.id); } catch { /* ignore */ }
      try { await supabase.from('deployments').update({ status, logs }).eq('id', deployRecord.id); } catch { /* ignore */ }
    };

    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n\n⏹  Orbit stopped gracefully.'));
      await cleanup('idle');
      process.exit(0);
    });

    startMetrics();
    await appendLog(`[orbit] Synced with dashboard. Project ID: ${project.id}\n`);
    await appendLog(`[orbit] Deployment ID: ${deployRecord.id}\n`);
    await appendLog(`[orbit] Telemetry streaming started (3s interval).\n\n`);

    // ── 8. Build & Deploy ────────────────────────────────────────────────
    try {
      // Build step (skip for tunnel — they just expose a running server)
      if (answers.platform !== 'tunnel') {
        banner('BUILD');
        console.log(chalk.blue('🛠️  Running build sequence...\n'));
        await appendLog('──── BUILD PHASE ────\n');
        await appendLog('$ npm run build\n\n');

        try {
          const build = execa('npm', ['run', 'build']);
          build.stdout?.on('data', (d: Buffer) => appendLog(d.toString()));
          build.stderr?.on('data', (d: Buffer) => appendLog(d.toString()));
          await build;

          console.log(chalk.green('✅ Build succeeded.\n'));
          await appendLog('\n✅ Build succeeded.\n\n');
        } catch (buildErr: any) {
          const stderr = buildErr?.stderr || '';
          const stdout = buildErr?.stdout || '';
          await appendLog(`\n${stdout}\n${stderr}\n`);
          await appendLog(`\n❌ BUILD FAILED (exit code: ${buildErr?.exitCode || 'unknown'})\n`);
          throw buildErr;
        }
      }

      let finalUrl = "";

      // ── Vercel ─────────────────────────────────────────────────────────
      if (answers.platform === 'vercel') {
        banner('DEPLOY → VERCEL');
        console.log(chalk.cyan('🚀 Pushing to Vercel...\n'));
        await appendLog('──── DEPLOY PHASE (Vercel) ────\n');
        await appendLog('$ npx vercel --yes --prod\n\n');

        try {
          const deploy = execa('npx', ['vercel', '--yes', '--prod']);
          deploy.stdout?.on('data', (d: Buffer) => appendLog(d.toString()));
          deploy.stderr?.on('data', (d: Buffer) => appendLog(d.toString()));
          const result = await deploy;

          const combined = result.stdout + '\n' + result.stderr;
          const match = combined.match(/https:\/\/[a-z0-9-]+\.vercel\.app/);
          finalUrl = match ? match[0] : "";

          if (!finalUrl) {
            await appendLog('\n⚠️  Deployed but could not extract URL.\n');
            console.log(chalk.yellow('⚠️  Deployed but could not extract URL. Check your Vercel dashboard.'));
          } else {
            await appendLog(`\n🌎 Deployed to: ${finalUrl}\n`);
          }
        } catch (deployErr: any) {
          const stderr = deployErr?.stderr || '';
          const stdout = deployErr?.stdout || '';
          await appendLog(`\n${stdout}\n${stderr}\n`);
          await appendLog(`\n❌ VERCEL DEPLOY FAILED (exit code: ${deployErr?.exitCode || 'unknown'})\n`);
          throw deployErr;
        }
      }

      // ── Netlify ────────────────────────────────────────────────────────
      if (answers.platform === 'netlify') {
        banner('DEPLOY → NETLIFY');
        const outDir = detectOutputDir();
        console.log(chalk.cyan(`🚀 Pushing to Netlify (output: ${outDir})...\n`));
        await appendLog('──── DEPLOY PHASE (Netlify) ────\n');
        await appendLog(`$ npx netlify deploy --prod --dir=${outDir}\n\n`);

        try {
          const deploy = execa('npx', ['netlify', 'deploy', '--prod', `--dir=${outDir}`]);
          deploy.stdout?.on('data', (d: Buffer) => appendLog(d.toString()));
          deploy.stderr?.on('data', (d: Buffer) => appendLog(d.toString()));
          const result = await deploy;

          const combined = result.stdout + '\n' + result.stderr;
          const match = combined.match(/https:\/\/[a-z0-9-]+\.netlify\.app/);
          finalUrl = match ? match[0] : "";

          if (!finalUrl) {
            await appendLog('\n⚠️  Deployed but could not extract URL.\n');
            console.log(chalk.yellow('⚠️  Deployed but could not extract URL. Check your Netlify dashboard.'));
          } else {
            await appendLog(`\n🌎 Deployed to: ${finalUrl}\n`);
          }
        } catch (deployErr: any) {
          const stderr = deployErr?.stderr || '';
          const stdout = deployErr?.stdout || '';
          await appendLog(`\n${stdout}\n${stderr}\n`);
          await appendLog(`\n❌ NETLIFY DEPLOY FAILED (exit code: ${deployErr?.exitCode || 'unknown'})\n`);
          throw deployErr;
        }
      }

      // ── VPS ────────────────────────────────────────────────────────────
      if (answers.platform === 'vps') {
        banner('DEPLOY → VPS');
        console.log(chalk.cyan(`🚀 Deploying to ${vpsConfig.host}...\n`));
        await appendLog('──── DEPLOY PHASE (VPS) ────\n');
        await appendLog(`Host     : ${vpsConfig.host}\n`);
        await appendLog(`User     : ${vpsConfig.username}\n`);
        await appendLog(`Domain   : ${vpsConfig.domain}\n`);
        await appendLog(`Port     : ${vpsConfig.port}\n\n`);

        const privateKey = fs.readFileSync(vpsConfig.keyPath, 'utf-8');
        const result = await deployToVPS({
          host: vpsConfig.host,
          username: vpsConfig.username,
          privateKey,
          projectName: answers.projectName,
          domain: vpsConfig.domain,
          port: vpsConfig.port
        });

        if (!result.success) {
          await appendLog(`\n❌ VPS DEPLOYMENT FAILED\n`);
          await appendLog(`Error: ${result.error}\n`);
          throw new Error(`VPS deployment failed: ${result.error}`);
        }

        finalUrl = result.url || "";
        await appendLog(`\n✅ VPS deployment complete.\n`);
        await appendLog(`🌎 URL: ${finalUrl}\n`);
      }

      // ── Tunnel ─────────────────────────────────────────────────────────
      if (answers.platform === 'tunnel') {
        banner('ORBIT TUNNEL');
        console.log(chalk.blue(`⚡ Bridging localhost:${tunnelPort} → public URL...\n`));
        await appendLog('──── TUNNEL PHASE ────\n');
        await appendLog(`$ cloudflared tunnel --url http://localhost:${tunnelPort}\n\n`);

        const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${tunnelPort}`]);

        tunnel.on('error', async (err) => {
          console.error(chalk.red(`\n❌ Tunnel error: ${err.message}`));
          await appendLog(`\n❌ TUNNEL ERROR: ${err.message}\n`);
          await cleanup('failed');
          process.exit(1);
        });

        tunnel.on('close', async (code) => {
          if (code !== 0 && code !== null) {
            console.error(chalk.red(`\n❌ Tunnel exited with code ${code}`));
            await appendLog(`\n❌ Tunnel process exited with code ${code}\n`);
            await cleanup('failed');
            process.exit(1);
          }
        });

        tunnel.stdout?.on('data', async (data: Buffer) => {
          await appendLog(data.toString());
        });

        tunnel.stderr.on('data', async (data: Buffer) => {
          const output = data.toString();
          await appendLog(output);

          const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);

          if (match && !finalUrl) {
            finalUrl = match[0];
            console.log(chalk.green.bold(`🌎 YOUR PROJECT IS LIVE AT: `) + chalk.white.underline(finalUrl));
            console.log(chalk.gray(`\nMetrics are streaming to your Orbit Dashboard.`));
            console.log(chalk.gray(`Press Ctrl+C to stop the tunnel.\n`));

            await appendLog(`\n🌎 Public URL: ${finalUrl}\n`);
            await supabase.from('projects').update({ status: 'success', domain: finalUrl }).eq('id', project.id);
            await supabase.from('deployments').update({ status: 'success', logs }).eq('id', deployRecord.id);
          }
        });

        // Keep alive until SIGINT
        await new Promise(() => { });
      }

      // ── Finalize (non-tunnel) ──────────────────────────────────────────
      await appendLog('\n──── COMPLETE ────\n');
      await appendLog(`Status  : success\n`);
      if (finalUrl) {
        await appendLog(`URL     : ${finalUrl}\n`);
        await supabase.from('projects').update({ domain: finalUrl }).eq('id', project.id);
      }
      await appendLog(`Time    : ${new Date().toISOString()}\n`);
      await cleanup('success');

      console.log('');
      banner('MISSION COMPLETE');
      if (finalUrl) {
        console.log(chalk.green.bold(`\n🌎 Live at: `) + chalk.white.underline(finalUrl));
      }
      console.log(chalk.green('\n✅ Orbit Mission Complete!\n'));

    } catch (err: any) {
      const errorMsg = err?.shortMessage || err?.message || String(err);
      const stderr = err?.stderr || '';
      const stdout = err?.stdout || '';

      // Build a detailed failure report for the dashboard
      await appendLog('\n──── FAILED ────\n');
      await appendLog(`Status    : failed\n`);
      await appendLog(`Error     : ${errorMsg}\n`);
      await appendLog(`Exit Code : ${err?.exitCode || 'N/A'}\n`);
      await appendLog(`Time      : ${new Date().toISOString()}\n`);
      if (stderr && !logs.includes(stderr)) {
        await appendLog(`\n──── STDERR ────\n${stderr}\n`);
      }
      if (stdout && !logs.includes(stdout)) {
        await appendLog(`\n──── STDOUT ────\n${stdout}\n`);
      }
      if (err?.command) {
        await appendLog(`\nCommand: ${err.command}\n`);
      }

      console.error(chalk.red('\n❌ Deployment failed:'), errorMsg);
      await cleanup('failed');
    }
  });

// ─── Pre-flight Checks ──────────────────────────────────────────────────────

async function runPreflight(platform: string): Promise<{ ok: boolean }> {
  console.log('');

  if (platform === 'vercel') {
    // Check if Vercel CLI is available
    console.log(chalk.gray('🔍 Checking Vercel CLI...'));
    try {
      await execa('npx', ['vercel', 'whoami']);
      console.log(chalk.green('✅ Vercel authenticated.\n'));
      return { ok: true };
    } catch {
      console.log(chalk.yellow('⚠️  Not logged in to Vercel. Starting login...\n'));
      try {
        await execa('npx', ['vercel', 'login'], { stdio: 'inherit' });
        // Verify after login
        await execa('npx', ['vercel', 'whoami']);
        console.log(chalk.green('\n✅ Vercel authenticated. Continuing...\n'));
        return { ok: true };
      } catch {
        console.error(chalk.red('\n❌ Vercel login failed or was cancelled.'));
        return { ok: false };
      }
    }
  }

  if (platform === 'netlify') {
    console.log(chalk.gray('🔍 Checking Netlify CLI...'));
    try {
      await execa('npx', ['netlify', 'status']);
      console.log(chalk.green('✅ Netlify authenticated.\n'));
      return { ok: true };
    } catch {
      console.log(chalk.yellow('⚠️  Not logged in to Netlify. Starting login...\n'));
      try {
        await execa('npx', ['netlify', 'login'], { stdio: 'inherit' });
        // Verify after login
        await execa('npx', ['netlify', 'status']);
        console.log(chalk.green('\n✅ Netlify authenticated. Continuing...\n'));
        return { ok: true };
      } catch {
        console.error(chalk.red('\n❌ Netlify login failed or was cancelled.'));
        return { ok: false };
      }
    }
  }

  if (platform === 'tunnel') {
    console.log(chalk.gray('🔍 Checking Cloudflared...'));
    const installed = await commandExists('cloudflared');
    if (!installed) {
      console.error(chalk.red('\n❌ cloudflared is not installed.'));
      console.log(chalk.yellow('\nInstall it with one of these methods:\n'));
      console.log(chalk.cyan('  # Debian / Ubuntu'));
      console.log(chalk.white('  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb'));
      console.log(chalk.white('  sudo dpkg -i cloudflared.deb\n'));
      console.log(chalk.cyan('  # macOS'));
      console.log(chalk.white('  brew install cloudflared\n'));
      console.log(chalk.cyan('  # Or visit:'));
      console.log(chalk.white('  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n'));
      return { ok: false };
    }
    console.log(chalk.green('✅ cloudflared found.\n'));
    return { ok: true };
  }

  if (platform === 'vps') {
    // VPS just needs SSH — we'll test connectivity after collecting config
    console.log(chalk.gray('🔍 Checking SSH client...'));
    const hasSsh = await commandExists('ssh');
    if (!hasSsh) {
      console.error(chalk.red('\n❌ SSH client not found. Install openssh-client.'));
      return { ok: false };
    }
    const hasDocker = await commandExists('docker');
    if (!hasDocker) {
      console.log(chalk.yellow('⚠️  Docker not found locally (not required — Docker must be on the VPS).'));
    }
    console.log(chalk.green('✅ SSH client ready.\n'));
    return { ok: true };
  }

  return { ok: true };
}

// ─── Parse ───────────────────────────────────────────────────────────────────

program.parse();