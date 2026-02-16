import { NodeSSH } from 'node-ssh';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import { execa } from 'execa';
import os from 'os';

const ssh = new NodeSSH();

export async function deployToVPS(config: {
  host: string;
  username: string;
  privateKey: string;
  projectName: string;
  domain: string;
  port: string;
}) {
  const remotePath = `~/orbit/${config.projectName}`;

  try {
    // 1. Connect
    console.log(chalk.gray('  🔗  Connecting to VPS...'));
    await ssh.connect({
      host: config.host,
      username: config.username,
      privateKey: config.privateKey,
      readyTimeout: 15000,
    });
    console.log(chalk.green(`  ✅  Connected to ${config.host}`));

    // 2. Prepare remote directory
    console.log(chalk.gray('  📁  Preparing remote directory...'));
    await ssh.execCommand(`rm -rf ${remotePath} && mkdir -p ${remotePath}`);

    // 3. Create a tar of the project (excluding node_modules, .next, .git, dist)
    console.log(chalk.gray('  📦  Packaging project...'));
    const tarName = `orbit-upload-${Date.now()}.tar.gz`;
    const tarPath = path.join(os.tmpdir(), tarName);

    await execa('tar', [
      '-czf', tarPath,
      '--exclude=node_modules',
      '--exclude=.next',
      '--exclude=.git',
      '--exclude=dist',
      '--exclude=.env',
      '--exclude=.env.local',
      '.'
    ]);

    // 4. Upload tar to VPS
    console.log(chalk.gray('  ⬆️   Uploading project files...'));
    await ssh.putFile(tarPath, `${remotePath}/project.tar.gz`);

    // 5. Extract on remote
    console.log(chalk.gray('  📂  Extracting on remote...'));
    await ssh.execCommand(`cd ${remotePath} && tar -xzf project.tar.gz && rm project.tar.gz`);

    // 6. Write Dockerfile
    console.log(chalk.gray('  🐳  Writing Dockerfile...'));
    const dockerfile = [
      'FROM node:20-slim',
      'WORKDIR /app',
      'COPY package*.json ./',
      'RUN npm ci --production=false',
      'COPY . .',
      'RUN npm run build',
      `EXPOSE ${config.port}`,
      'CMD ["npm", "start"]',
    ].join('\n');

    await ssh.execCommand(`cat > ${remotePath}/Dockerfile << 'ORBITEOF'\n${dockerfile}\nORBITEOF`);

    // 7. Build and run Docker container
    console.log(chalk.gray('  🏗️   Building Docker image...'));
    const containerName = `orbit-${config.projectName}`;

    // Stop and remove old container if it exists
    await ssh.execCommand(`docker stop ${containerName} 2>/dev/null; docker rm ${containerName} 2>/dev/null`);

    const buildResult = await ssh.execCommand(`cd ${remotePath} && docker build -t ${containerName} .`);
    if (buildResult.code !== 0) {
      throw new Error(`Docker build failed:\n${buildResult.stderr}`);
    }

    console.log(chalk.gray('  🚀  Starting container...'));
    const runResult = await ssh.execCommand(
      `docker run -d --name ${containerName} --restart unless-stopped -p ${config.port}:${config.port} ${containerName}`
    );
    if (runResult.code !== 0) {
      throw new Error(`Docker run failed:\n${runResult.stderr}`);
    }

    // 8. Configure Caddy (if domain provided)
    if (config.domain && config.domain !== 'none') {
      console.log(chalk.gray('  🌐  Configuring Caddy reverse proxy...'));
      const caddyBlock = `${config.domain} {\n    reverse_proxy localhost:${config.port}\n}`;
      // Append to Caddyfile if not already present
      await ssh.execCommand(
        `grep -q "${config.domain}" /etc/caddy/Caddyfile 2>/dev/null || echo '${caddyBlock}' >> /etc/caddy/Caddyfile && sudo systemctl reload caddy 2>/dev/null || true`
      );
    }

    // 9. Cleanup local tar
    fs.unlinkSync(tarPath);

    console.log(chalk.green('  ✅  VPS deployment complete!'));
    ssh.dispose();
    return { success: true, url: config.domain !== 'none' ? `https://${config.domain}` : `http://${config.host}:${config.port}` };

  } catch (error: any) {
    ssh.dispose();
    // Cleanup local tar if it exists
    const tarPath = path.join(os.tmpdir(), `orbit-upload-*.tar.gz`);
    try { fs.unlinkSync(tarPath); } catch { /* ignore */ }

    return { success: false, error: error.message || error };
  }
}

export async function testSSHConnection(host: string, username: string, privateKey: string): Promise<boolean> {
  const testSsh = new NodeSSH();
  try {
    await testSsh.connect({ host, username, privateKey, readyTimeout: 10000 });
    testSsh.dispose();
    return true;
  } catch {
    testSsh.dispose();
    return false;
  }
}