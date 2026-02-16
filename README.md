<p align="center">
  <img src="apps/dashboard/public/favicon.ico" width="80" />
</p>

<h1 align="center">🛰️ Orbit — The Neo-Brutalist Mini-PaaS</h1>

<p align="center">
  <strong>One CLI. One Dashboard. Ship Anywhere.</strong><br/>
  A high-performance, developer-first Platform-as-a-Service that simplifies the bridge between local development and global deployment.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@srizdebnath/orbit"><img src="https://img.shields.io/npm/v/@srizdebnath/orbit?style=flat-square&logo=npm&color=blue" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-ISC-green?style=flat-square" alt="License" />
</p>

---

## ✨ Features

| Feature | Description |
|---|---|
| **Multi-Platform Deploy** | Ship to **Vercel**, **Netlify**, **Self-Host (VPS)**, or **Laptop Hosting** via Cloudflare Tunnel — all from a single `orbit deploy` command. |
| **Live Telemetry** | Real-time **CPU & RAM** metrics streamed from your machine to the dashboard via Supabase Realtime WebSockets. |
| **Terminal Streaming** | Build logs piped live into a fully-featured **xterm.js** terminal viewer in the dashboard. |
| **CLI Authentication** | Secure 6-digit handshake flow: generate a code in the terminal, approve it in the browser via GitHub OAuth. |
| **Neo-Brutalist UI** | A bold, high-contrast dashboard with grid backgrounds, hard shadows, and monospace typography. |
| **Team Collaboration** | Invite team members to your projects via email and manage access from the Settings page. |
| **Deployment History** | Browse all past deployments per project with full log replay. |

---

## 🏗️ Project Architecture

Orbit is structured as a **monorepo** with two core packages:

```
orbit/
├── apps/
│   └── dashboard/          # Next.js 16 Web Dashboard (The Control Plane)
│       ├── src/app/         # App Router pages (home, projects, auth, setup, settings, logs)
│       └── src/components/  # Reusable UI (Navbar, ProjectCard, MetricChart, MetricDisplay, TerminalView)
│
├── packages/
│   └── cli/                # TypeScript CLI (The Launchpad)
│       └── src/
│           ├── index.ts    # Main CLI entry — login, deploy, tunnel orchestration
│           └── engine.ts   # VPS deployment engine (SSH + Docker + Caddy)
│
├── .gitignore
└── README.md               # ← You are here
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, Lucide Icons, Recharts, xterm.js |
| **Backend / DB** | Supabase (Auth, PostgreSQL, Real-time WebSockets) |
| **CLI** | Node.js, Commander, Inquirer, Execa, systeminformation, node-ssh, Cloudflared |
| **Hosting Targets** | Vercel, Netlify, Self-Host (VPS via Docker + Caddy), Laptop Hosting (Cloudflare Tunnel) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A free [Supabase](https://supabase.com) account
- *(Optional)* [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) for Laptop Hosting
- *(Optional)* Vercel CLI / Netlify CLI for platform deployments

### 1. Clone & Install

```bash
git clone https://github.com/Srizdebnath/Orbit-1.0.git
cd orbit
```

Install dependencies for both the dashboard and CLI:

```bash
# Dashboard
cd apps/dashboard
npm install

# CLI
cd ../../packages/cli
npm install
```

### 2. Setup Supabase

Follow the detailed instructions in [`apps/dashboard/README.md`](apps/dashboard/README.md) to:
1. Create the required database tables (`projects`, `deployments`, `metrics`, `cli_auth`, `project_members`).
2. Enable Supabase Realtime on all tables.
3. Enable GitHub OAuth provider.
4. Configure your `.env.local` with your Supabase credentials.

### 3. Run the Dashboard Locally

```bash
cd apps/dashboard
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

### 4. Build & Link the CLI

```bash
cd packages/cli
npm run build
npm link
```

Now you can use `orbit login` and `orbit deploy` globally from any terminal.

### 5. Deploy Your First Project

```bash
cd your-project-folder
orbit login        # Authenticate via GitHub
orbit deploy       # Choose a platform and launch 🚀
```

---

## 📂 Environment Variables

### Dashboard (`apps/dashboard/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous (public) key |

### CLI (`packages/cli/.env`)

The CLI has the Supabase credentials hardcoded for the published npm package. If you're self-hosting, update the constants in `src/index.ts`:
- `ORBIT_URL` — URL of your deployed dashboard
- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_ANON_KEY` — Your Supabase anonymous key

---

## 🗺️ Roadmap

- [ ] `orbit status` — Check live deployment status from the terminal
- [ ] `orbit rollback` — Revert to a previous deployment
- [ ] Custom domain support per project
- [ ] Per-project environment variables management
- [ ] Dark mode for the dashboard
- [ ] Docker Compose for full local self-host
- [ ] GitHub Actions CI/CD integration
- [ ] Notifications (Slack / Discord webhooks)

---

## 🤝 Contributing

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **ISC License**.

---

## 👨‍💻 Developed By

**Srizdebnath**

[GitHub](https://github.com/Srizdebnath) · [LinkedIn](https://linkedin.com/in/srizdebnath) · [Portfolio](https://sriz.vercel.app)
