# 💻 Orbit Dashboard — The Control Plane

> Real-time monitoring and management for your deployed fleet. Built with **Next.js 16**, **React 19**, **Tailwind CSS 4**, and **Supabase Realtime**.

---

## ✨ Features

- **Real-time Project Cards** — Live CPU/RAM telemetry via Supabase Realtime WebSockets
- **Terminal Log Viewer** — xterm.js terminal with ANSI color support for live + historical build logs
- **Detailed Failure Logs** — Full stderr, exit codes, and error messages captured from failed deployments
- **Live Metric Charts** — Recharts area graphs showing CPU load history, updated every 3 seconds
- **Deployment History** — Browse all past deployments with timestamps, status, and full log replay
- **Project Settings** — Rename projects, invite/remove team members by email, delete projects
- **CLI Authentication** — Browser-side handshake approval for the 6-digit code from `orbit login`
- **Setup Guide** — Onboarding page with CLI installation and first deployment steps
- **Neo-Brutalist Design** — Grid background, hard shadows, monospace typography, bold interactions
- **Shared Supabase Client** — Singleton pattern in `src/lib/supabase.ts` for consistent auth state

---

## 📁 Project Structure

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout (Space Grotesk + JetBrains Mono fonts)
│   │   ├── globals.css                     # Tailwind import, grid background, selection styles
│   │   ├── page.tsx                        # Home — project fleet grid, GitHub login, footer
│   │   ├── setup/page.tsx                  # Setup — CLI install steps + how-it-works
│   │   ├── auth/cli/page.tsx               # CLI handshake approval page
│   │   └── projects/[id]/
│   │       ├── page.tsx                    # Project overview — live telemetry + deploy history
│   │       ├── logs/page.tsx               # Terminal log viewer (live + historical)
│   │       └── settings/page.tsx           # Settings — rename, team access, danger zone
│   │
│   ├── components/
│   │   ├── Navbar.tsx                      # Fixed nav — auth state, GitHub login/logout
│   │   ├── ProjectCard.tsx                 # Project card — status badge, platform, metrics
│   │   ├── MetricChart.tsx                 # Recharts live CPU area chart (20-point window)
│   │   ├── MetricDisplay.tsx               # Single live metric value (CPU% or RAM MB)
│   │   └── TerminalView.tsx                # xterm.js terminal renderer with FitAddon
│   │
│   └── lib/
│       └── supabase.ts                     # Singleton Supabase client + Project/Deployment interfaces
│
├── public/
│   └── pic.jpeg                            # Developer profile photo (footer)
├── .env.local                              # (gitignored) Supabase credentials
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 🚀 Getting Started

### 1. Environment Variables

Create `apps/dashboard/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install & Run

```bash
cd apps/dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Database Setup (Supabase)

### 1. Create Tables

Run in Supabase SQL Editor:

```sql
-- Projects
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

-- Deployments
CREATE TABLE deployments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  logs TEXT DEFAULT '',
  status TEXT DEFAULT 'building',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Metrics (CPU/RAM telemetry)
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  cpu_usage FLOAT DEFAULT 0,
  ram_usage FLOAT DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- CLI Authentication codes
CREATE TABLE cli_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  is_approved BOOLEAN DEFAULT false,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team members
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Enable Realtime

1. Go to **Database → Publications** in Supabase
2. Edit the `supabase_realtime` publication
3. Toggle **ON** for: `projects`, `deployments`, `metrics`, `cli_auth`

### 3. Authentication

1. Go to **Authentication → Providers**
2. Enable the **GitHub** provider
3. Set Redirect URLs:
   - `http://localhost:3000` (local)
   - `https://your-domain.com` (production)

### 4. Row-Level Security (Recommended)

```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"
ON projects FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

---

## 🎨 Design System

| Element | Value |
|---|---|
| **Grid Background** | `--grid-size: 40px`, `--grid-color: rgba(0,0,0,0.04)` |
| **Header Font** | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (`--font-main`) |
| **Mono Font** | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (`--font-mono`) |
| **Hard Shadows** | `shadow-[Xpx_Ypx_0px_0px_rgba(0,0,0,1)]` |
| **Borders** | `border-2` to `border-4`, `border-black` |
| **Hover Lift** | `hover:-translate-x-1 hover:-translate-y-1` |
| **Accent** | `blue-600` (#2563EB) |
| **Terminal BG** | `#0a0a0a` via xterm.js |
| **Text Selection** | `::selection { background: #000; color: #fff; }` |

---

## 📦 Deploy to Vercel

1. Import repo in [Vercel](https://vercel.com/new)
2. Set **Root Directory** to `apps/dashboard`
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

---

## 🔧 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 📜 License

ISC

---

© 2026 Orbit. Built by [Srizdebnath](https://github.com/Srizdebnath).
