# 💻 Orbit Dashboard (Control Plane)

The Orbit Dashboard is a real-time monitoring and management interface for your deployed fleet.

## 🚀 Deployment (Vercel)

1. **Environment Variables:**
   Create a `.env.local` file with the following:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. **Vercel Setup:**
   - Import the repo.
   - Set the Root Directory to `apps/dashboard`.
   - Add the environment variables above.

## 🗄️ Database Setup (Supabase)

### 1. SQL Schema
Run the following tables in your SQL Editor:
- `projects`: (id, name, platform, status, domain, user_id)
- `deployments`: (id, project_id, logs, status)
- `metrics`: (id, project_id, cpu_usage, ram_usage)
- `cli_auth`: (id, code, is_approved, user_id)

### 2. Real-time Enabling
You **must** enable Realtime for your tables to see live graphs and logs:
1. Go to **Database > Publications**.
2. Edit `supabase_realtime`.
3. Toggle `projects`, `deployments`, `metrics`, and `cli_auth` to **ON**.

### 3. Authentication
- Enable **GitHub Provider** in Auth > Providers.
- Set the Redirect URL to `your-domain.com/auth/cli`.

## 🎨 UI & Design
Orbit uses a **Neo-Brutalist** design system:
- **Grid Background:** Configurable via `--grid-size` in `globals.css`.
- **Typography:** Uses `Space Grotesk` for headers and `JetBrains Mono` for data.
- **Components:** Custom `TerminalView` using `xterm.js` for ANSI color support.

---
© 2026 Orbit Control Plane. Active Node.
