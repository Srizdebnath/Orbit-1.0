# 🛰️ Orbit CLI — The Launchpad

> Deploy anywhere from your terminal. Authenticate, build, push, and stream live telemetry — all in one command.

[![npm](https://img.shields.io/npm/v/@srizdebnath/orbit?style=flat-square&logo=npm&color=blue)](https://www.npmjs.com/package/@srizdebnath/orbit)

**Current Version:** `1.1.4`

---

## 📦 Installation

```bash
npm install -g @srizdebnath/orbit
```

**Requirements:**
- Node.js ≥ 18, npm ≥ 9
- *(Tunnel)* [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) in PATH
- *(VPS)* SSH client + remote server with Docker installed

> **Note:** Vercel and Netlify CLIs are auto-installed via `npx` if not present. The CLI auto-prompts login if you're not authenticated.

---

## 🛠️ Commands

### `orbit login`

Securely links your terminal to the Orbit Dashboard via GitHub OAuth.

- Generates a 6-digit alphanumeric code
- Opens browser to dashboard's `/auth/cli?code=XXXXXX`
- Polls for approval every 2 seconds with a **2-minute timeout**
- Saves session to `~/.orbit_session.json`
- If already logged in, asks before overwriting

```
$ orbit login
🔑 Login Code: A3BX9K
   Opening browser...
   Waiting for approval (120s timeout)...
✅ Authenticated! You can now run orbit deploy
```

### `orbit logout`

Removes the local session file.

```
$ orbit logout
✅ Logged out. Session cleared.
```

### `orbit status`

View the status of all your deployed projects at a glance.

- Shows **platform**, **status**, **domain**, **deploy count**, and **last deploy time**
- Filter by project name with `--project` / `-p`
- Human-readable relative timestamps ("5m ago", "2d ago")

```
$ orbit status

📡 Fetching projects from Orbit Dashboard...

 ORBIT STATUS 

  my-awesome-project
  ├─ Platform   : ▲ Vercel
  ├─ Status     : ● Live
  ├─ Domain     : https://my-awesome-project.vercel.app
  ├─ Deploys    : 5
  └─ Last Deploy: 2h ago

  api-backend
  ├─ Platform   : 🖥  VPS
  ├─ Status     : ● Live
  ├─ Domain     : https://api.example.com
  ├─ Deploys    : 12
  └─ Last Deploy: 1d ago

  Total: 2 project(s)
```

**Flags:**

| Flag | Description |
|---|---|
| `-p, --project <name>` | Filter results by project name (partial match) |

### `orbit rollback`

Rollback a project to a previous deployment. Interactive deployment history picker.

- **Interactive project picker** or specify with `--project` / `-p`
- Shows the **current deployment** and up to **20 previous deployments**
- Displays deployment hash, status, and relative timestamp
- **Platform-aware**: triggers Vercel rollback, Netlify restore, or VPS guidance
- Creates a rollback record in the database so the dashboard stays in sync
- Confirmation prompt before executing

```
$ orbit rollback

📡 Fetching your projects...

? Select a project to rollback: my-awesome-project (vercel) ● Live

📋 Loading deployment history for my-awesome-project...

  Current deployment:
  └─ #a1b2c3d4  ● success  2h ago

? Rollback to which deployment?
❯ #e5f6g7h8  ● success  1d ago
  #i9j0k1l2  ● success  3d ago
  #m3n4o5p6  ✖ failed   5d ago

? Rollback my-awesome-project to deployment #e5f6g7h8? Yes

 ROLLBACK 
🔄 Rolling back my-awesome-project...
  📡 Promoting previous Vercel deployment...
  ✅ Vercel rollback triggered.
  📡 Updating Orbit Dashboard...
  ✅ Dashboard updated.

 ROLLBACK COMPLETE 
✅ my-awesome-project rolled back to deployment #e5f6g7h8
```

**Flags:**

| Flag | Description |
|---|---|
| `-p, --project <name>` | Specify project by name (skip interactive picker) |

### `orbit deploy`

The core command. Interactive deployment with full pre-flight checks.

**Flow:**
1. **Session check** — not logged in? Prompts to run `orbit login` inline
2. **Project check** — verifies `package.json` exists in current directory
3. **Platform selection** — pick Vercel, Netlify, Tunnel, or VPS
4. **Pre-flight auth** — checks platform auth, auto-runs login if needed
5. **Platform config** — collects port (tunnel), SSH details (VPS)
6. **Database sync** — upserts project + creates deployment record in Supabase
7. **Telemetry start** — 3-second CPU/RAM sampling via `systeminformation`
8. **Build** — `npm run build` with stdout+stderr streamed to dashboard
9. **Deploy** — platform-specific push with real-time log streaming
10. **Finalize** — updates status, saves URL, stops telemetry

---

## 🚀 Platform Details

### ▲ Vercel

```
$ orbit deploy
✔ Select Target Platform: ▲  Vercel — Serverless Edge
✔ Project Name: my-app
🔍 Checking Vercel authentication...
⚠️  Not logged in to Vercel. Starting login...
> (Vercel login runs interactively right here)
✅ Vercel authenticated. Continuing...

 BUILD 
🛠️  Running build sequence...
✅ Build succeeded.

 DEPLOY → VERCEL 
🚀 Pushing to Vercel...

 MISSION COMPLETE 
🌎 Live at: https://my-app.vercel.app
✅ Orbit Mission Complete!
```

- Runs `npx vercel whoami` → if fails, runs `npx vercel login` with `stdio: 'inherit'` → re-verifies
- Builds locally first, then pushes with `npx vercel --yes --prod`
- Extracts URL from both stdout and stderr (Vercel CLI varies)

### ◆ Netlify

- Same auto-login flow via `npx netlify status` / `npx netlify login`
- **Auto-detects output directory** — checks `.next` → `dist` → `build` → `out`
- Deploys with `npx netlify deploy --prod --dir=<detected>`

### ⚡ Laptop Tunnel (Cloudflare)

- Pre-flight checks `cloudflared` is installed (prints install instructions if not)
- Prompts for port with validation (1–65535)
- **Checks if port is actually reachable** via TCP socket — warns if nothing is running
- Streams both stdout and stderr from cloudflared to dashboard
- Handles tunnel process crashes (`error` and `close` events)
- SIGINT (Ctrl+C) gracefully stops tunnel + cleans up metrics

### 🖥 Self-Host VPS (Docker + Caddy)

- Prompts for: host, username, SSH key path (validates file exists), domain, port
- **Tests SSH connection** with 10-second timeout before proceeding
- Tars project (excluding `node_modules`, `.next`, `.git`, `.env`)
- Uploads via SCP, extracts on remote
- Generates Dockerfile (Node 20, multi-stage: `npm ci` → build → start)
- Stops old container if exists, builds new image, starts with `--restart unless-stopped`
- Configures Caddy reverse proxy if domain is provided

---

## 📋 Dashboard Log Format

Every deployment streams structured, detailed logs to the dashboard terminal:

```
─── Orbit Build Log ───
Timestamp : 2026-02-16T06:12:30.000Z
Project   : my-app
Platform  : vercel
Directory : /home/user/projects/my-app
────────────────────────────────────────

[orbit] Synced with dashboard. Project ID: abc123
[orbit] Deployment ID: def456
[orbit] Telemetry streaming started (3s interval).

──── BUILD PHASE ────
$ npm run build

> my-app@1.0.0 build
> next build
   ✓ Compiled successfully
   ...

✅ Build succeeded.

──── DEPLOY PHASE (Vercel) ────
$ npx vercel --yes --prod

Vercel CLI 50.17.1
Production: https://my-app.vercel.app

🌎 Deployed to: https://my-app.vercel.app

──── COMPLETE ────
Status  : success
URL     : https://my-app.vercel.app
Time    : 2026-02-16T06:14:12.000Z
```

**On failure**, the full error details are captured:

```
──── FAILED ────
Status    : failed
Error     : Command failed with exit code 1: npx vercel --yes --prod
Exit Code : 1
Time      : 2026-02-16T06:14:12.000Z

──── STDERR ────
Error: The specified token is not valid...

Command: npx vercel --yes --prod
```

---

## ⚙️ Architecture

```
packages/cli/
├── src/
│   ├── index.ts        # Commander program — login, logout, status, rollback, deploy + pre-flight checks
│   ├── config.ts       # Supabase URL, anon key, dashboard URL (bundled into build)
│   └── engine.ts       # VPS engine — SSH connect → tar upload → Docker build → Caddy
├── dist/               # Compiled JS (generated by npm run build)
├── package.json
└── tsconfig.json
```

---

## 🔧 Development

```bash
cd packages/cli
npm install
npm run build       # tsc → dist/
npm link            # Makes `orbit` available globally
```

**Watch mode:**

```bash
npm run dev         # tsc --watch
```

---

## 📜 License

ISC

## 👨‍💻 Author

**Srizdebnath** — [GitHub](https://github.com/Srizdebnath) · [LinkedIn](https://linkedin.com/in/srizdebnath) · [Portfolio](https://sriz.vercel.app)

---

## 📝 Changelog

### v1.1.4 (2026-02-17)
- **New:** `orbit status` — View all projects with deploy count, status, domain, and last deploy time
- **New:** `orbit rollback` — Interactive rollback to any previous deployment with platform-specific handling
- **Fix:** Supabase keys are now bundled into the build — npm users no longer need a `.env` file
- **Removed:** `dotenv` dependency (no longer needed)

### v1.1.3
- Detailed build/deploy log streaming (stdout + stderr)
- VPS deployment engine (Docker + Caddy)
- Laptop tunnel via Cloudflare