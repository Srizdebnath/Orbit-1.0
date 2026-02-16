
# 🛰️ Orbit: The Neo-Brutalist Mini-PaaS

**Orbit** is a high-performance, developer-first Platform-as-a-Service (PaaS) that simplifies the bridge between local development and global deployment. Built with a high-contrast Neo-Brutalist aesthetic, Orbit provides real-time telemetry, terminal streaming, and multi-platform deployment—all from a single command.

---

## 🏗️ Project Architecture

Orbit is structured as a **Monorepo** to share logic between the control plane and the command-line interface:

- `apps/dashboard`: A Next.js 16 Web Dashboard (The Control Plane).
- `packages/cli`: A TypeScript-based Command Line Interface (The Launchpad).

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons, Recharts, Xterm.js.
- **Backend:** Supabase (Auth, PostgreSQL, Real-time WebSockets).
- **CLI:** Node.js, Commander, Inquirer, Execa, Systeminformation, Cloudflared.
- **Hosting Targets:** Vercel, Netlify, Self-Host (VPS), and Laptop Hosting (Tunnel).

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Srizdebnath/Orbit-1.0.git
cd orbit
npm install
```

### 2. Setup Database
Follow the instructions in `apps/dashboard/README.md` to configure your Supabase instance and environment variables.

### 3. Install CLI Globally
```bash
cd packages/cli
npm run build
npm link
```

## 👨‍💻 Developed By
**Srizdebnath**  
[GitHub](https://github.com/Srizdebnath) | [LinkedIn](https://linkedin.com/in/srizdebnath) | [Portfolio](https://sriz.vercel.app)




