import { NodeSSH } from 'node-ssh';
import path from 'path';

const ssh = new NodeSSH();

export async function deployToVPS(config: {
  host: string;
  username: string;
  privateKey: string;
  projectName: string;
  domain: string;
}) {
  try {
    console.log('🔗 Connecting to VPS...');
    await ssh.connect({
      host: config.host,
      username: config.username,
      privateKey: config.privateKey
    });

    await ssh.execCommand(`mkdir -p ~/orbit/${config.projectName}`);

    const dockerfile = `
FROM node:18-slim
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
    `;
    
    await ssh.execCommand(`echo "${dockerfile}" > ~/orbit/${config.projectName}/Dockerfile`);
    const caddyConfig = `
${config.domain} {
    reverse_proxy localhost:3000
}
    `;
    await ssh.execCommand(`echo "${caddyConfig}" >> /etc/caddy/Caddyfile && systemctl reload caddy`);

    return { success: true };
  } catch (error) {
    console.error('Deployment Engine Error:', error);
    return { success: false, error };
  }
}