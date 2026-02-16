'use client'
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import {
  Terminal, Cpu, Cloud, Zap, Copy, Check,
  Rocket, ShieldCheck, Server, Wifi,
  Package, LogIn, LogOut, ChevronRight,
  ArrowRight, MonitorSmartphone, HardDrive, Globe, Lock
} from 'lucide-react';

// ─── Mac Terminal Component ──────────────────────────────────────────────
function MacTerminal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mac-terminal">
      <div className="mac-terminal-header">
        <span className="mac-dot mac-dot-red" />
        <span className="mac-dot mac-dot-yellow" />
        <span className="mac-dot mac-dot-green" />
        <span className="mac-terminal-title">{title}</span>
      </div>
      <div className="mac-terminal-body">
        {children}
      </div>
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs text-gray-400 hover:text-white transition-all"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Command Reference Card ─────────────────────────────────────────────
function CommandCard({
  command, description, icon, flags, example
}: {
  command: string;
  description: string;
  icon: React.ReactNode;
  flags?: { flag: string; desc: string }[];
  example?: { input: string; output: string[] };
}) {
  return (
    <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(37,99,235,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.5)] transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg shrink-0">
          {icon}
        </div>
        <div>
          <code className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">{command}</code>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
      </div>

      {flags && flags.length > 0 && (
        <div className="mt-4 border-t border-black/5 dark:border-white/5 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Flags & Options</p>
          <div className="space-y-1.5">
            {flags.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <code className="font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">{f.flag}</code>
                <span className="text-gray-500 dark:text-gray-400">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {example && (
        <div className="mt-4">
          <MacTerminal title="Terminal">
            <p><span className="prompt">❯</span> <span className="command">{example.input}</span></p>
            {example.output.map((line, i) => (
              <p key={i} className="output">{line}</p>
            ))}
          </MacTerminal>
        </div>
      )}
    </div>
  );
}

// ─── Section Title ───────────────────────────────────────────────────────
function SectionTitle({ children, badge }: { children: React.ReactNode; badge?: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">{children}</h2>
      {badge && (
        <span className="bg-blue-600 dark:bg-blue-500 text-white text-[10px] font-bold uppercase px-3 py-1 tracking-widest">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Platform Card ───────────────────────────────────────────────────────
function PlatformCard({
  icon, name, subtitle, features
}: {
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  features: string[];
}) {
  return (
    <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] transition-all group">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h3 className="font-black uppercase italic tracking-tighter text-lg">{name}</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <ChevronRight size={14} className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── MAIN SETUP PAGE ─────────────────────────────────────────────────────
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Setup() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto pt-36 px-6 md:px-8 pb-32">

        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <div className="mb-20">
          <p className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.3em] text-xs italic mb-4">Documentation</p>
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-6 leading-[0.9]">
            Setup<br />Guide<span className="text-blue-600 dark:text-blue-400">.</span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-xl">
            Everything you need to get Orbit up and running. From installation to your first deployment in under 2 minutes.
          </p>
        </div>


        {/* ━━━ SECTION 1: Quick Start ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="3 Steps">Quick Start</SectionTitle>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="group">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-blue-600 dark:text-blue-400 italic leading-none">01</span>
                <div>
                  <p className="font-black uppercase tracking-widest text-xs">Install the CLI</p>
                  <p className="text-xs text-gray-400 mt-0.5">Install globally via npm to enable the <code className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">orbit</code> command</p>
                </div>
              </div>
              <MacTerminal title="Terminal — Installation">
                <p>
                  <span className="prompt">❯</span>
                  <span className="command"> npm install -g @srizdebnath/orbit</span>
                  <CopyButton text="npm install -g @srizdebnath/orbit" />
                </p>
                <p className="output mt-2">added 142 packages in 8s</p>
                <p className="success">✅ orbit@1.1.3 installed globally</p>
              </MacTerminal>
            </div>

            {/* Step 2 */}
            <div className="group">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-blue-600 dark:text-blue-400 italic leading-none">02</span>
                <div>
                  <p className="font-black uppercase tracking-widest text-xs">Authenticate</p>
                  <p className="text-xs text-gray-400 mt-0.5">Securely link your terminal to your Orbit Dashboard via GitHub OAuth</p>
                </div>
              </div>
              <MacTerminal title="Terminal — Authentication">
                <p><span className="prompt">❯</span> <span className="command">orbit login</span><CopyButton text="orbit login" /></p>
                <p className="output mt-2">🔑 Login Code: <span className="info">A7X2K9</span></p>
                <p className="output">   Opening browser...</p>
                <p className="output">   Waiting for approval (120s timeout)...</p>
                <p className="success mt-1">✅ Authenticated! You can now run <span className="info">orbit deploy</span></p>
              </MacTerminal>
            </div>

            {/* Step 3 */}
            <div className="group">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl font-black text-blue-600 dark:text-blue-400 italic leading-none">03</span>
                <div>
                  <p className="font-black uppercase tracking-widest text-xs">Deploy</p>
                  <p className="text-xs text-gray-400 mt-0.5">Navigate to any React, Next.js, or Vite project and deploy</p>
                </div>
              </div>
              <MacTerminal title="Terminal — Deployment">
                <p><span className="prompt">❯</span> <span className="command">cd my-awesome-project</span></p>
                <p><span className="prompt">❯</span> <span className="command">orbit deploy</span><CopyButton text="orbit deploy" /></p>
                <p className="output mt-2">? Select Target Platform:</p>
                <p className="info">  ▲  Vercel         — Serverless Edge</p>
                <p className="output">  ◆  Netlify        — JAMstack CDN</p>
                <p className="output">  ⚡ Laptop Tunnel  — Cloudflare Tunnel</p>
                <p className="output">  🖥  Self-Host VPS  — Docker + Caddy</p>
                <p className="output mt-2">? Project Name: <span className="command">my-awesome-project</span></p>
                <p className="output mt-1">📡 Syncing with Orbit Dashboard...</p>
                <p className="info"> BUILD </p>
                <p className="output">🛠️  Running build sequence...</p>
                <p className="success">✅ Build succeeded.</p>
                <p className="info mt-1"> DEPLOY → VERCEL </p>
                <p className="output">🚀 Pushing to Vercel...</p>
                <p className="success mt-1"> MISSION COMPLETE </p>
                <p className="success">🌎 Live at: <span className="command">https://my-awesome-project.vercel.app</span></p>
              </MacTerminal>
            </div>
          </div>
        </section>


        {/* ━━━ SECTION 2: Complete Command Reference ━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="All Commands">CLI Reference</SectionTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 -mt-4">
            Every command available in the Orbit CLI. Run <code className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">orbit --help</code> to see them all.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CommandCard
              command="orbit login"
              description="Authenticate your terminal with the Orbit Dashboard via a secure 6-digit handshake code + GitHub OAuth."
              icon={<LogIn size={20} />}
              flags={[
                { flag: '--force', desc: 'Re-authenticate even if already logged in' }
              ]}
              example={{
                input: 'orbit login',
                output: [
                  '🔑 Login Code: A7X2K9',
                  '   Opening browser...',
                  '   Waiting for approval (120s timeout)...',
                  '✅ Authenticated! You can now run orbit deploy'
                ]
              }}
            />

            <CommandCard
              command="orbit logout"
              description="Remove your local Orbit session file (~/.orbit_session.json). This does not revoke your GitHub OAuth token."
              icon={<LogOut size={20} />}
              example={{
                input: 'orbit logout',
                output: ['✅ Logged out. Session cleared.']
              }}
            />

            <CommandCard
              command="orbit deploy"
              description="Interactive deployment — pick your target platform, build your project, deploy, and stream live telemetry to your dashboard."
              icon={<Rocket size={20} />}
              flags={[
                { flag: 'Vercel', desc: 'Serverless edge deployment via Vercel CLI' },
                { flag: 'Netlify', desc: 'JAMstack CDN deployment via Netlify CLI' },
                { flag: 'VPS', desc: 'Self-hosted via Docker + Caddy over SSH' },
                { flag: 'Tunnel', desc: 'Expose localhost via Cloudflare Tunnel' }
              ]}
            />

            <CommandCard
              command="orbit --version"
              description="Print the currently installed version of the Orbit CLI."
              icon={<Package size={20} />}
              example={{
                input: 'orbit --version',
                output: ['1.1.3']
              }}
            />

            <CommandCard
              command="orbit --help"
              description="Display all available commands and options."
              icon={<Terminal size={20} />}
              example={{
                input: 'orbit --help',
                output: [
                  'Usage: orbit [options] [command]',
                  '',
                  'Deploy anywhere from your terminal. Powered by Orbit.',
                  '',
                  'Options:',
                  '  -V, --version   output the version number',
                  '  -h, --help      display help for command',
                  '',
                  'Commands:',
                  '  login           Authenticate your terminal with the Orbit Dashboard',
                  '  logout          Remove your local Orbit session',
                  '  deploy          Build, deploy, and stream telemetry for your project',
                  '  help [command]  display help for command'
                ]
              }}
            />

            <CommandCard
              command="orbit help [cmd]"
              description="Get detailed help for a specific command, including usage, options, and arguments."
              icon={<ShieldCheck size={20} />}
              example={{
                input: 'orbit help deploy',
                output: [
                  'Usage: orbit deploy [options]',
                  '',
                  'Build, deploy, and stream telemetry for your project',
                ]
              }}
            />
          </div>
        </section>


        {/* ━━━ SECTION 3: Deploy Platforms ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="4 Targets">Deployment Platforms</SectionTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 -mt-4">
            Orbit supports deploying to multiple platforms. Each platform is auto-detected and configured during <code className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px]">orbit deploy</code>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <PlatformCard
              icon={<Globe size={28} />}
              name="Vercel"
              subtitle="Serverless Edge"
              features={[
                'Auto-checks Vercel CLI authentication',
                'Launches inline login if not authenticated',
                'Runs npm run build → npx vercel --yes --prod',
                'Auto-extracts deployment URL',
                'Full build logs streamed to dashboard'
              ]}
            />
            <PlatformCard
              icon={<Cloud size={28} />}
              name="Netlify"
              subtitle="JAMstack CDN"
              features={[
                'Auto-checks Netlify CLI authentication',
                'Auto-detects output directory (.next, dist, build, out)',
                'Runs npm run build → npx netlify deploy --prod',
                'Auto-extracts deployment URL',
                'Full build logs streamed to dashboard'
              ]}
            />
            <PlatformCard
              icon={<Wifi size={28} />}
              name="Laptop Tunnel"
              subtitle="Cloudflare Tunnel"
              features={[
                'Checks for cloudflared installation',
                'Verifies target port is reachable on localhost',
                'Creates a public trycloudflare.com URL',
                'No build step — exposes running dev server',
                'Tunnel stays active until Ctrl+C'
              ]}
            />
            <PlatformCard
              icon={<Server size={28} />}
              name="Self-Host VPS"
              subtitle="Docker + Caddy"
              features={[
                'Collects SSH credentials (host, username, key path)',
                'Tests SSH connection before proceeding',
                'Uploads project via tar/SCP to VPS',
                'Builds Docker image on remote server',
                'Configures Caddy reverse proxy for custom domain'
              ]}
            />
          </div>

          {/* Platform deployment flow terminal */}
          <MacTerminal title="Terminal — VPS Deployment Example">
            <p><span className="prompt">❯</span> <span className="command">orbit deploy</span></p>
            <p className="output mt-1">? Select Target Platform: <span className="info">🖥  Self-Host VPS — Docker + Caddy</span></p>
            <p className="output">? Project Name: <span className="command">my-app</span></p>
            <p className="output">? VPS IP / Hostname: <span className="command">192.168.1.100</span></p>
            <p className="output">? SSH Username: <span className="command">root</span></p>
            <p className="output">? Path to SSH private key: <span className="command">~/.ssh/id_rsa</span></p>
            <p className="output">? Domain (or &quot;none&quot; to skip Caddy): <span className="command">myapp.example.com</span></p>
            <p className="output">? Port to expose: <span className="command">3000</span></p>
            <p className="output mt-2">🔍 Testing SSH connection...</p>
            <p className="success">✅ SSH connection verified.</p>
            <p className="output mt-1">📡 Syncing with Orbit Dashboard...</p>
            <p className="info"> BUILD </p>
            <p className="output">🛠️  Running build sequence...</p>
            <p className="success">✅ Build succeeded.</p>
            <p className="info mt-1"> DEPLOY → VPS </p>
            <p className="output">🚀 Deploying to 192.168.1.100...</p>
            <p className="success mt-1">✅ VPS deployment complete.</p>
            <p className="success">🌎 URL: https://myapp.example.com</p>
          </MacTerminal>
        </section>


        {/* ━━━ SECTION 4: Auth Flow ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="Security">Authentication Flow</SectionTitle>

          <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: '01', icon: <Terminal size={24} />, title: 'Generate Code', desc: 'CLI generates a unique 6-digit handshake code and stores it in Supabase.' },
                { step: '02', icon: <Globe size={24} />, title: 'Browser Opens', desc: 'Your browser opens the Orbit Dashboard at /auth/cli?code=XXXXXX.' },
                { step: '03', icon: <Lock size={24} />, title: 'GitHub OAuth', desc: 'You sign in via GitHub. The dashboard approves the CLI auth code.' },
                { step: '04', icon: <Check size={24} />, title: 'Session Saved', desc: 'CLI detects approval, saves session to ~/.orbit_session.json. Done!' }
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-blue-600 dark:bg-blue-500 text-white rounded-xl">
                    {s.icon}
                  </div>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400 italic mb-1">{s.step}</p>
                  <h3 className="font-black uppercase text-sm tracking-tighter mb-2">{s.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <MacTerminal title="Terminal — Auth Session File">
            <p><span className="prompt">❯</span> <span className="command">cat ~/.orbit_session.json</span></p>
            <p className="output mt-1">{'{'}</p>
            <p className="output">  <span className="info">&quot;user_id&quot;</span>: <span className="command">&quot;a1b2c3d4-5e6f-7890-abcd-ef1234567890&quot;</span></p>
            <p className="output">{'}'}</p>
          </MacTerminal>
        </section>


        {/* ━━━ SECTION 5: How It Works ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="Architecture">How It Works</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <MechanismCard
              icon={<Terminal size={28} />}
              title="Local Capture"
              text="CLI zips your project, runs npm run build, and captures real-time stdout + stderr build logs. Logs are streamed via Supabase to the dashboard in real-time."
            />
            <MechanismCard
              icon={<Cpu size={28} />}
              title="Live Telemetry"
              text="Your machine's CPU load and RAM usage are sampled every 3 seconds using the systeminformation library and streamed via Supabase Realtime to the dashboard."
            />
            <MechanismCard
              icon={<Cloud size={28} />}
              title="Edge Deployment"
              text="Orbit triggers platform-specific CLIs (Vercel, Netlify) or custom SSH + Docker pipelines to host your app globally. Deployment URLs are captured and synced."
            />
          </div>
        </section>


        {/* ━━━ SECTION 6: Prerequisites ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="Requirements">Prerequisites</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)]">
              <h3 className="font-black uppercase italic text-lg tracking-tighter mb-4 flex items-center gap-2">
                <HardDrive size={18} className="text-blue-600 dark:text-blue-400" /> Required
              </h3>
              <ul className="space-y-3">
                {[
                  'Node.js ≥ 18',
                  'npm ≥ 9',
                  'A GitHub account (for OAuth)',
                  'A project with package.json (React, Next.js, Vite, etc.)'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)]">
              <h3 className="font-black uppercase italic text-lg tracking-tighter mb-4 flex items-center gap-2">
                <MonitorSmartphone size={18} className="text-blue-600 dark:text-blue-400" /> Optional
              </h3>
              <ul className="space-y-3">
                {[
                  'Vercel CLI — auto-prompted during deploy if not logged in',
                  'Netlify CLI — auto-prompted during deploy if not logged in',
                  'cloudflared — required only for Laptop Tunnel mode',
                  'SSH client + Docker — required only for VPS deployment'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ArrowRight size={14} className="text-amber-500 shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8">
            <MacTerminal title="Terminal — Install Cloudflared (optional)">
              <p className="output"># Debian / Ubuntu</p>
              <p><span className="prompt">❯</span> <span className="command">curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb</span></p>
              <p><span className="prompt">❯</span> <span className="command">sudo dpkg -i cloudflared.deb</span></p>
              <p className="output mt-3"># macOS</p>
              <p><span className="prompt">❯</span> <span className="command">brew install cloudflared</span><CopyButton text="brew install cloudflared" /></p>
            </MacTerminal>
          </div>
        </section>


        {/* ━━━ SECTION 7: Troubleshooting ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-24">
          <SectionTitle badge="FAQ">Troubleshooting</SectionTitle>

          <div className="space-y-4">
            {[
              {
                q: 'orbit: command not found',
                a: 'Make sure you installed globally: npm install -g @srizdebnath/orbit. Verify with which orbit or orbit --version.'
              },
              {
                q: 'Login times out after 120 seconds',
                a: 'Ensure your browser opened the auth URL and you approved it via GitHub. If the tab didn\'t open, copy the URL from the terminal output manually.'
              },
              {
                q: 'No package.json found in current directory',
                a: 'orbit deploy must be run from the root of your project that contains a package.json file.'
              },
              {
                q: 'Vercel / Netlify deploy fails with auth error',
                a: 'Orbit auto-prompts you to log in to Vercel/Netlify if not authenticated. If that fails, try: npx vercel login or npx netlify login separately first.'
              },
              {
                q: 'VPS deployment — SSH connection refused',
                a: 'Verify your VPS IP, SSH username, and private key path. Ensure port 22 is open on the VPS and the key is not passphrase-protected (or use ssh-agent).'
              },
              {
                q: 'Tunnel — cloudflared not found',
                a: 'Install cloudflared using the instructions above. On macOS: brew install cloudflared. On Linux: download the .deb or binary from Cloudflare.'
              }
            ].map((item, i) => (
              <div key={i} className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] transition-all">
                <p className="font-black text-sm uppercase italic tracking-tight text-red-500 dark:text-red-400 mb-2 flex items-center gap-2">
                  <Zap size={14} /> {item.q}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ━━━ SECTION 8: Environment Variables ━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mb-16">
          <SectionTitle badge="Config">Environment Variables</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-black uppercase italic text-sm tracking-widest mb-4 text-blue-600 dark:text-blue-400">Dashboard (.env.local)</h3>
              <MacTerminal title=".env.local">
                <p><span className="flag">NEXT_PUBLIC_SUPABASE_URL</span>=<span className="command">https://your-project.supabase.co</span></p>
                <p><span className="flag">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>=<span className="command">your-anon-key</span></p>
              </MacTerminal>
            </div>
            <div>
              <h3 className="font-black uppercase italic text-sm tracking-widest mb-4 text-blue-600 dark:text-blue-400">CLI (packages/cli/src/config.ts)</h3>
              <MacTerminal title="config.ts">
                <p><span className="flag">ORBIT_URL</span> = <span className="command">&quot;https://orbit.yourdomain.com&quot;</span></p>
                <p><span className="flag">SUPABASE_URL</span> = <span className="command">&quot;https://xxx.supabase.co&quot;</span></p>
                <p><span className="flag">SUPABASE_ANON_KEY</span> = <span className="command">&quot;eyJhbGciOi...&quot;</span></p>
              </MacTerminal>
            </div>
          </div>
        </section>


        {/* ━━━ CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="border-4 border-black dark:border-white/10 bg-blue-600 dark:bg-blue-600/20 p-10 text-center shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(59,130,246,0.3)]">
          <Rocket size={40} className="mx-auto mb-4 text-white dark:text-blue-400" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">Ready to Launch?</h2>
          <MacTerminal title="Terminal">
            <p><span className="prompt">❯</span> <span className="command">npm install -g @srizdebnath/orbit</span></p>
            <p><span className="prompt">❯</span> <span className="command">orbit login</span></p>
            <p><span className="prompt">❯</span> <span className="command">orbit deploy</span></p>
            <p className="success mt-2">🚀 Mission Complete!</p>
          </MacTerminal>
        </div>

      </div>
    </main>
  );
}


// ─── Mechanism Card ──────────────────────────────────────────────────────
function MechanismCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border-2 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(59,130,246,0.3)] hover:-translate-y-1 transition-transform">
      <div className="text-blue-600 dark:text-blue-400 mb-4">{icon}</div>
      <h3 className="font-black uppercase italic tracking-tighter text-xl mb-3">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{text}</p>
    </div>
  );
}