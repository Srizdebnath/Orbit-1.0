# 💻 Orbit Dashboard — The Control Plane

> A real-time monitoring and management interface for your deployed fleet. Built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **Supabase Realtime**.

---

## ✨ Features

- **Real-time Project Cards** — Live CPU/RAM telemetry, deployment status, and project metadata updated via Supabase Realtime WebSockets.
- **Terminal Log Viewer** — Full xterm.js terminal with ANSI color support displaying build logs streamed during deployment.
- **Live Metric Charts** — Recharts-powered area graphs showing CPU load history per project, updated in real-time.
- **Deployment History** — Browse all past deployments for each project with timestamps, status badges, and log replay.
- **Project Settings** — Rename projects, manage team access (invite by email), and delete projects from a dedicated settings panel.
- **CLI Authentication** — Browser-side handshake approval page that verifies the 6-digit code from `orbit login`.
- **Setup Guide** — Interactive onboarding page walking users through CLI installation and first deployment.
- **Neo-Brutalist Design** — High-contrast, grid-based layout with hard shadows, monospace typography, and bold interactions.

---

## 📁 Project Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (Space Grotesk + JetBrains Mono fonts)
│   │   ├── globals.css                   # Tailwind import, grid background, selection styles
│   │   ├── page.tsx                      # Home — project fleet grid + GitHub login + footer
│   │   ├── favicon.ico
│   │   ├── auth/
│   │   │   └── cli/page.tsx              # CLI handshake approval page
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # Project overview — telemetry + deployment history
│   │   │       ├── logs/page.tsx         # Terminal log viewer (live + historical)
│   │   │       └── settings/page.tsx     # Project settings — rename, team, delete
│   │   └── setup/
│   │       └── page.tsx                  # Interactive setup/onboarding guide
│   │
│   └── components/
│       ├── Navbar.tsx                    # Fixed nav bar — auth state, logout, navigation
│       ├── ProjectCard.tsx               # Project card — status, platform, metrics, links
│       ├── MetricChart.tsx               # Recharts area chart — live CPU history
│       ├── MetricDisplay.tsx             # Single metric value (CPU % or RAM MB) — live
│       └── TerminalView.tsx              # xterm.js terminal renderer for build logs
│
├── public/
│   └── pic.jpeg                          # Developer profile photo (footer)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── .env.local                            # (gitignored) Supabase environment variables
```

---

## 🚀 Getting Started

### 1. Environment Variables

Create a `.env.local` file in `apps/dashboard/`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install Dependencies

```bash
cd apps/dashboard
npm install
```

### 3. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 🗄️ Database Setup (Supabase)

### 1. Create Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('vercel', 'netlify', 'tunnel', 'vps')),
  status TEXT DEFAULT 'idle',
  domain TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Deployments table
CREATE TABLE deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  logs TEXT DEFAULT '',
  status TEXT DEFAULT 'building',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metrics table
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  cpu_usage FLOAT DEFAULT 0,
  ram_usage FLOAT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- CLI Authentication table
CREATE TABLE cli_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_approved BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project Members table (for team collaboration)
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Enable Realtime

You **must** enable Realtime on the relevant tables for live updates:

1. Go to **Database → Publications** in the Supabase Dashboard.
2. Edit the `supabase_realtime` publication.
3. Toggle **ON** for: `projects`, `deployments`, `metrics`, `cli_auth`.

### 3. Configure Authentication

1. Go to **Authentication → Providers** in Supabase.
2. Enable the **GitHub** provider.
3. Set the **Redirect URL** to:
   - Local dev: `http://localhost:3000/auth/cli`
   - Production: `https://your-domain.com/auth/cli`

### 4. Row-Level Security (RLS)

For production deployments, enable RLS on all tables and add policies so users can only read/write their own data. Example:

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own projects"
ON projects FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 🎨 Design System

Orbit uses a **Neo-Brutalist** design system with the following conventions:

| Element | Implementation |
|---|---|
| **Grid Background** | Configurable via `--grid-size` and `--grid-color` CSS variables in `globals.css` |
| **Header Font** | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (`--font-main`) |
| **Mono/Data Font** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (`--font-mono`) |
| **Hard Shadows** | `shadow-[Xpx_Ypx_0px_0px_rgba(0,0,0,1)]` pattern |
| **Borders** | Thick solid borders (`border-2` to `border-4`, always `border-black`) |
| **Interactive States** | Translate-based hover effects (`hover:-translate-x-1 hover:-translate-y-1`) |
| **Accent Color** | `blue-600` (#2563EB) used for highlights, links, and active states |
| **Terminal** | Custom xterm.js terminal with `#0a0a0a` background and JetBrains Mono font |

---

## 📦 Deploying to Production (Vercel)

1. Import the repository in the [Vercel Dashboard](https://vercel.com/new).
2. Set the **Root Directory** to `apps/dashboard`.
3. Add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

> **Note:** The Vercel build command should auto-detect `next build`. No custom overrides needed.

---

## 🔧 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

---

## 📜 License

ISC

---

© 2026 Orbit Control Plane. Active Node.
