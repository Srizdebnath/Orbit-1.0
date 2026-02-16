# 🛰️ Orbit CLI (v1.1.0)

The Orbit Command Line Interface is your gateway to the Orbit ecosystem. It handles local build execution, hardware telemetry streaming, and deployment handshakes.

## 📦 Installation

Install globally via NPM:

```bash
npm install -g @srizdebnath/orbit
```

## 🛠️ Commands

### 1. `orbit login`
Initializes a secure handshake between your local machine and the Orbit Dashboard.
- Generates a unique 6-digit session code.
- Opens your browser for GitHub authentication.
- Stores a secure session token in `~/.orbit_session.json`.

### 2. `orbit deploy`
The core command to launch your project.
- **Platforms:** Vercel, Netlify, Laptop Hosting (Tunnel), VPS.
- **Process:** Executes `npm run build`, captures logs, and streams them to the dashboard.
- **Telemetry:** Streams CPU and RAM usage live during the process.

### 3. `orbit tunnel`
Exposes your local development port to the public internet using Cloudflare Tunnels.
- **Usage:** `orbit deploy` -> Select `Laptop Hosting`.
- **Port:** Defaults to `3000`.

## ⚙️ How it Works

1. **Detection:** Orbit looks for a `package.json` in your current directory.
2. **Handshake:** It identifies the user via the saved session token.
3. **Telemetry:** Uses `systeminformation` to sample CPU load every 3 seconds.
4. **Streaming:** Pipes `stdout` from build processes directly to the Supabase `deployments` table via an active database connection.

## ⚠️ Requirements
- **Cloudflare Tunnels:** To use Laptop Hosting, ensure `cloudflared` is installed on your system.
- **Vercel/Netlify:** Ensure you have logged into their respective CLIs on your machine.