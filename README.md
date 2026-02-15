
```markdown
# 🛰️ Orbit 

**Orbit** is a high-performance Mini-PaaS (Platform as a Service) designed for developers who want to launch projects into the cloud with zero friction. Using a Neo-Brutalist design language and real-time streaming, Orbit bridges the gap between your local terminal and global infrastructure.

---

## 🚀 Features

- **One-Command Deployment:** Run `orbit deploy` to launch projects to Vercel, Netlify, or Self-Host.
- **Real-time Terminal Streaming:** Watch your build logs stream to the web dashboard as they happen.
- **Hardware Telemetry:** Live monitoring of CPU and RAM usage during deployments.
- **Identity Handshake:** Secure terminal-to-web authentication flow.
- **Neo-Brutalist Dashboard:** A high-contrast, graph-paper themed UI for managing your fleet.

---

## 🛠️ Tech Stack

- **CLI:** TypeScript, Commander, Execa, Inquirer
- **Dashboard:** Next.js 14 (App Router), Tailwind CSS
- **Backend/DB:** Supabase (Auth, Realtime, PostgreSQL)
- **Monitoring:** Systeminformation (Node.js)

---

## 🏁 Getting Started (Local Development)

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project
- GitHub OAuth App (configured in Supabase)

### 2. Database Setup
Run the SQL schema provided in `/docs/schema.sql` (or see the setup guide in-app) to initialize your tables and enable Realtime.

### 3. Installation

**Clone the repository:**
```bash
git clone https://github.com/yourusername/orbit.git
cd orbit
```

**Setup the Dashboard:**
```bash
cd apps/dashboard
npm install
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
npm run dev
```

**Setup the CLI:**
```bash
cd packages/cli
npm install
npm run build
npm link
```

---

## 📖 Usage Guide

1. **Login:** Initialize your session.
   ```bash
   orbit login
   ```
2. **Launch:** Run from any web project folder.
   ```bash
   orbit deploy
   ```

---

## 🛣️ Roadmap

- [ ] **Orbital Agent:** Docker-based agent for automatic VPS provisioning.
- [ ] **Edge Metrics:** Long-term analytics for project traffic.
- [ ] **Orbit Teams:** Collaborative project management.
- [ ] **Custom Caddy Integration:** Automatic SSL for self-hosted domains.

Built by Sriz Debnath
```
