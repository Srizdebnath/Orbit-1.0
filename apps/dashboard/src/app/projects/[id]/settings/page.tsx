'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
    Trash2, UserPlus, Shield, AlertTriangle,
    Key, Eye, EyeOff, Plus, Globe, Lock, Unlock, Clock,
    Copy, Check, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectSettings() {
    const { id } = useParams();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [members, setMembers] = useState<any[]>([]);

    // Env vars state
    const [envVars, setEnvVars] = useState<any[]>([]);
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [showValues, setShowValues] = useState(false);
    const [envLoading, setEnvLoading] = useState(false);

    // Domains state
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [domainLoading, setDomainLoading] = useState(false);

    useEffect(() => {
        fetchProjectData();
    }, [id]);

    async function fetchProjectData() {
        const { data } = await supabase.from('projects').select('*').eq('id', id).single();
        setProject(data);
        const { data: mems } = await supabase.from('project_members').select('*').eq('project_id', id);
        setMembers(mems || []);

        // Fetch env vars
        const { data: envData } = await supabase
            .from('env_variables')
            .select('*')
            .eq('project_id', id)
            .order('key', { ascending: true });
        setEnvVars(envData || []);

        // Fetch custom domains
        const { data: domainData } = await supabase
            .from('custom_domains')
            .select('*')
            .eq('project_id', id)
            .order('created_at', { ascending: false });
        setDomains(domainData || []);
    }

    async function updateProject(updates: any) {
        await supabase.from('projects').update(updates).eq('id', id);
        fetchProjectData();
    }

    async function deleteProject() {
        if (confirm("Are you ABSOLUTELY sure? This will delete all logs and metrics permanently.")) {
            await supabase.from('projects').delete().eq('id', id);
            router.push('/');
        }
    }

    async function inviteMember(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('project_members').insert({ project_id: id, user_email: email });
        if (!error) {
            setEmail('');
            fetchProjectData();
        }
    }

    async function removeMember(memberId: string) {
        const { error } = await supabase.from('project_members').delete().eq('id', memberId);
        if (!error) {
            fetchProjectData();
        }
    }

    // ─── Env Var Handlers ───────────────────────────────────────────────
    async function addEnvVar(e: React.FormEvent) {
        e.preventDefault();
        if (!newKey.trim()) return;
        setEnvLoading(true);

        const { error } = await supabase.from('env_variables').upsert(
            { project_id: id, key: newKey.trim(), value: newValue, updated_at: new Date().toISOString() },
            { onConflict: 'project_id,key' }
        );
        if (!error) {
            setNewKey('');
            setNewValue('');
            fetchProjectData();
        }
        setEnvLoading(false);
    }

    async function deleteEnvVar(envId: string) {
        await supabase.from('env_variables').delete().eq('id', envId);
        fetchProjectData();
    }

    // ─── Domain Handlers ────────────────────────────────────────────────
    async function addDomain(e: React.FormEvent) {
        e.preventDefault();
        if (!newDomain.trim()) return;
        setDomainLoading(true);

        const { error } = await supabase.from('custom_domains').insert({
            project_id: id,
            domain: newDomain.trim(),
            ssl_status: 'pending',
            verified: false
        });
        if (!error) {
            setNewDomain('');
            fetchProjectData();
        }
        setDomainLoading(false);
    }

    async function deleteDomain(domainId: string) {
        await supabase.from('custom_domains').delete().eq('id', domainId);
        fetchProjectData();
    }

    if (!project) return null;

    return (
        <main className="min-h-screen pt-32 px-8 pb-20">
            <Navbar />
            <div className="max-w-5xl mx-auto">

                {/* Back Link */}
                <Link href={`/projects/${id}`} className="flex items-center gap-2 text-xs font-black uppercase hover:underline mb-8">
                    <ArrowLeft size={16} /> Back to Project
                </Link>

                <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-12">Settings<span className="text-blue-600 dark:text-blue-400">.</span></h1>

                <div className="space-y-12">

                    {/* ─── General Settings ──────────────────────────────────── */}
                    <section className="p-8 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                        <h2 className="text-xl font-black uppercase mb-6 italic underline">General</h2>
                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase">Project Name</label>
                            <input
                                className="w-full border-2 border-black dark:border-white/10 p-3 font-mono text-sm focus:bg-blue-50 dark:focus:bg-blue-500/10 outline-none bg-white dark:bg-white/[0.03]"
                                defaultValue={project.name}
                                onBlur={(e) => updateProject({ name: e.target.value })}
                            />
                        </div>
                    </section>

                    {/* ─── Environment Variables ─────────────────────────────── */}
                    <section className="p-8 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Key size={20} className="text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-black uppercase italic underline">Environment Variables</h2>
                            </div>
                            <button
                                onClick={() => setShowValues(!showValues)}
                                className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                title={showValues ? 'Hide values' : 'Show values'}
                            >
                                {showValues ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showValues ? 'Hide' : 'Show'}
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mb-6">
                            Manage via CLI: <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">orbit env set KEY=VALUE -p {project.name}</code>
                        </p>

                        {/* Add new var */}
                        <form onSubmit={addEnvVar} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="KEY"
                                className="w-40 border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03] uppercase"
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                                required
                            />
                            <input
                                type={showValues ? 'text' : 'password'}
                                placeholder="value"
                                className="flex-1 border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03]"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                disabled={envLoading}
                                className="bg-black dark:bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </form>

                        {/* Existing vars */}
                        <div className="space-y-2">
                            {envVars.length === 0 && (
                                <p className="text-xs text-gray-400 italic py-4 text-center">No environment variables set</p>
                            )}
                            {envVars.map((v: any) => (
                                <div key={v.id} className="flex items-center justify-between p-3 border-2 border-black/10 dark:border-white/10 group hover:border-black dark:hover:border-blue-400 transition-colors">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <code className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">{v.key}</code>
                                        <span className="text-gray-300 dark:text-gray-600">=</span>
                                        <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                                            {showValues ? v.value : '•'.repeat(Math.min(v.value.length, 32))}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => deleteEnvVar(v.id)}
                                        className="text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shrink-0 ml-4"
                                        title="Remove variable"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {envVars.length > 0 && (
                            <p className="text-[10px] text-gray-400 mt-4 text-right font-mono uppercase tracking-wider">
                                {envVars.length} variable{envVars.length !== 1 ? 's' : ''} // orbit env pull -p {project.name}
                            </p>
                        )}
                    </section>

                    {/* ─── Custom Domains ────────────────────────────────────── */}
                    <section className="p-8 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                        <div className="flex items-center gap-2 mb-6">
                            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
                            <h2 className="text-xl font-black uppercase italic underline">Custom Domains</h2>
                        </div>

                        <p className="text-xs text-gray-400 mb-6">
                            CLI: <code className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">orbit domains add mydomain.com -p {project.name}</code>
                        </p>

                        {/* Add domain */}
                        <form onSubmit={addDomain} className="flex gap-2 mb-6">
                            <input
                                type="text"
                                placeholder="app.example.com"
                                className="flex-1 border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03]"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value.toLowerCase())}
                                required
                            />
                            <button
                                type="submit"
                                disabled={domainLoading}
                                className="bg-black dark:bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
                            >
                                <Plus size={16} />
                            </button>
                        </form>

                        {/* Existing domains */}
                        <div className="space-y-3">
                            {domains.length === 0 && (
                                <p className="text-xs text-gray-400 italic py-4 text-center">No custom domains configured</p>
                            )}
                            {domains.map((d: any) => (
                                <div key={d.id} className="flex items-center justify-between p-4 border-2 border-black/10 dark:border-white/10 group hover:border-black dark:hover:border-blue-400 transition-colors">
                                    <div className="flex items-center gap-4">
                                        {d.ssl_status === 'active' ? (
                                            <Lock size={16} className="text-green-500" />
                                        ) : d.ssl_status === 'failed' ? (
                                            <Unlock size={16} className="text-red-500" />
                                        ) : (
                                            <Clock size={16} className="text-yellow-500 animate-pulse" />
                                        )}
                                        <div>
                                            <p className="font-mono text-sm font-bold">{d.domain}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className={`text-[10px] font-black uppercase ${d.ssl_status === 'active' ? 'text-green-600 dark:text-green-400' :
                                                    d.ssl_status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                                        'text-yellow-600 dark:text-yellow-400'
                                                    }`}>
                                                    SSL: {d.ssl_status}
                                                </span>
                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                <span className={`text-[10px] font-black uppercase ${d.verified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                                    {d.verified ? 'Verified' : 'Pending Verification'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteDomain(d.id)}
                                        className="text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        title="Remove domain"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* DNS instructions */}
                        {domains.length > 0 && (
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-white/[0.03] border-2 border-dashed border-black/10 dark:border-white/10">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">DNS Configuration</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {project.platform === 'vercel' && 'Point your CNAME record to cname.vercel-dns.com'}
                                    {project.platform === 'netlify' && 'Point your CNAME record to your-site.netlify.app'}
                                    {project.platform === 'vps' && 'Point your A record to your VPS IP address. Caddy will auto-provision SSL.'}
                                    {project.platform === 'tunnel' && 'Tunnel domains are auto-generated. For custom domains, use a CNAME.'}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ─── Team Access ───────────────────────────────────────── */}
                    <section className="p-8 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(37,99,235,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                        <h2 className="text-xl font-black uppercase mb-6 italic underline">Team Access</h2>

                        <form onSubmit={inviteMember} className="flex gap-2 mb-8">
                            <input
                                type="email"
                                placeholder="teammate@email.com"
                                className="flex-1 border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03]"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button className="bg-black dark:bg-blue-600 text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors">
                                <UserPlus size={16} />
                            </button>
                        </form>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 border-2 border-black dark:border-white/10 bg-gray-50 dark:bg-white/[0.03]">
                                <span className="text-xs font-bold truncate pr-4 italic">You (Owner)</span>
                                <Shield size={14} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            {members.map((m: any) => (
                                <div key={m.id} className="flex justify-between items-center p-3 border-2 border-black dark:border-white/10 group">
                                    <span className="text-xs font-mono truncate pr-4">{m.user_email}</span>
                                    <button
                                        onClick={() => removeMember(m.id)}
                                        className="text-red-500 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                                        title="Remove member"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─── Danger Zone ───────────────────────────────────────── */}
                    <section className="p-8 border-4 border-red-500 dark:border-red-500/50 bg-red-50 dark:bg-red-500/10 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)] dark:shadow-[8px_8px_0px_0px_rgba(239,68,68,0.3)]">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                            <AlertTriangle size={20} />
                            <h2 className="text-xl font-black uppercase italic">Danger Zone</h2>
                        </div>
                        <p className="text-xs font-bold mb-6 text-red-800 dark:text-red-300 uppercase">Deleting this project will remove all associated telemetry data, env variables, and domains instantly.</p>
                        <button
                            onClick={deleteProject}
                            className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Delete Project
                        </button>
                    </section>

                </div>
            </div>
        </main>
    );
}