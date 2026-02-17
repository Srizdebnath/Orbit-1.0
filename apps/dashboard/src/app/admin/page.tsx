'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import {
    ShieldCheck, Users, Layers, Activity,
    Clock, Globe, Key, FileCode, Rocket,
    Server, Cloud, Wifi, Monitor, Trash2,
    ChevronDown, ChevronRight, ExternalLink,
    AlertTriangle, CheckCircle2, XCircle, Loader2,
    BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface AdminData {
    users: any[];
    projects: any[];
    deployments: any[];
    envVars: any[];
    apiKeys: any[];
    domains: any[];
    members: any[];
}

export default function AdminPanel() {
    const [user, setUser] = useState<any>(null);
    const [data, setData] = useState<AdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'deployments'>('overview');

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                setLoading(false);
                return;
            }

            // Get the session token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('No active session');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/admin', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });

                if (res.status === 403) {
                    setError('FORBIDDEN');
                    setLoading(false);
                    return;
                }

                if (!res.ok) {
                    const err = await res.json();
                    setError(err.error || 'Failed to load admin data');
                    setLoading(false);
                    return;
                }

                const adminData = await res.json();
                setData(adminData);
            } catch (e: any) {
                setError(e.message);
            }
            setLoading(false);
        };
        init();
    }, []);

    // ─── Helpers ────────────────────────────────────────────────────────
    function timeAgo(date: string | null): string {
        if (!date) return 'never';
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    }

    function platformIcon(platform: string) {
        switch (platform) {
            case 'vercel': return <Cloud size={14} className="text-black dark:text-white" />;
            case 'netlify': return <Globe size={14} className="text-teal-500" />;
            case 'vps': return <Server size={14} className="text-orange-500" />;
            case 'tunnel': return <Wifi size={14} className="text-purple-500" />;
            default: return <Monitor size={14} />;
        }
    }

    function statusBadge(status: string) {
        const styles: Record<string, string> = {
            success: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30',
            building: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-500/30',
            failed: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30',
            idle: 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-white/20',
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase border rounded ${styles[status] || styles.idle}`}>
                {status === 'success' && <CheckCircle2 size={10} />}
                {status === 'building' && <Loader2 size={10} className="animate-spin" />}
                {status === 'failed' && <XCircle size={10} />}
                {status}
            </span>
        );
    }

    function toggleUser(userId: string) {
        setExpandedUsers(prev => {
            const next = new Set(prev);
            next.has(userId) ? next.delete(userId) : next.add(userId);
            return next;
        });
    }

    function toggleProject(projectId: string) {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            next.has(projectId) ? next.delete(projectId) : next.add(projectId);
            return next;
        });
    }

    // ─── Loading / Error / Forbidden States ─────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center font-mono">
            <div className="text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <p className="italic text-sm animate-pulse">ORBIT_ADMIN_SYNC...</p>
            </div>
        </div>
    );

    if (!user) return (
        <main className="min-h-screen pt-40 px-8">
            <Navbar />
            <div className="max-w-xl mx-auto text-center">
                <ShieldCheck size={64} className="mx-auto mb-6 text-red-500" />
                <h1 className="text-4xl font-black italic uppercase mb-4">Access Denied</h1>
                <p className="text-gray-600 dark:text-gray-400">You must be logged in.</p>
            </div>
        </main>
    );

    if (error === 'FORBIDDEN') return (
        <main className="min-h-screen pt-40 px-8">
            <Navbar />
            <div className="max-w-xl mx-auto text-center">
                <AlertTriangle size={64} className="mx-auto mb-6 text-red-500" />
                <h1 className="text-4xl font-black italic uppercase mb-4">Forbidden</h1>
                <p className="text-gray-600 dark:text-gray-400">This page is restricted to the system administrator.</p>
            </div>
        </main>
    );

    if (error) return (
        <main className="min-h-screen pt-40 px-8">
            <Navbar />
            <div className="max-w-xl mx-auto text-center">
                <XCircle size={64} className="mx-auto mb-6 text-red-500" />
                <h1 className="text-4xl font-black italic uppercase mb-4">Error</h1>
                <p className="text-red-500 font-mono text-sm">{error}</p>
            </div>
        </main>
    );

    if (!data) return null;

    // ─── Computed Stats ─────────────────────────────────────────────────
    const totalUsers = data.users.length;
    const totalProjects = data.projects.length;
    const totalDeployments = data.deployments.length;
    const totalEnvVars = data.envVars.length;
    const totalApiKeys = data.apiKeys.length;
    const totalDomains = data.domains.length;

    const liveProjects = data.projects.filter(p => p.status === 'success').length;
    const failedProjects = data.projects.filter(p => p.status === 'failed').length;
    const buildingProjects = data.projects.filter(p => p.status === 'building').length;

    const successDeploys = data.deployments.filter(d => d.status === 'success').length;
    const failedDeploys = data.deployments.filter(d => d.status === 'failed').length;

    const platformCounts: Record<string, number> = {};
    data.projects.forEach(p => { platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1; });

    // Group projects by user
    const projectsByUser: Record<string, any[]> = {};
    data.projects.forEach(p => {
        if (!projectsByUser[p.user_id]) projectsByUser[p.user_id] = [];
        projectsByUser[p.user_id].push(p);
    });

    // Group deployments by project
    const deploysByProject: Record<string, any[]> = {};
    data.deployments.forEach(d => {
        if (!deploysByProject[d.project_id]) deploysByProject[d.project_id] = [];
        deploysByProject[d.project_id].push(d);
    });

    // Env vars by project
    const envByProject: Record<string, number> = {};
    data.envVars.forEach(e => { envByProject[e.project_id] = (envByProject[e.project_id] || 0) + 1; });

    // Domains by project
    const domainsByProject: Record<string, any[]> = {};
    data.domains.forEach(d => {
        if (!domainsByProject[d.project_id]) domainsByProject[d.project_id] = [];
        domainsByProject[d.project_id].push(d);
    });

    return (
        <main className="min-h-screen pt-32 px-8 pb-20">
            <Navbar />
            <div className="max-w-7xl mx-auto">

                {/* ─── Header ────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck size={20} className="text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">System Admin</span>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black italic tracking-tighter uppercase leading-none">
                            Control<span className="text-red-500">.</span>Panel
                        </h1>
                    </div>
                    <div className="font-mono text-xs text-gray-400 text-right">
                        <p>Admin: {user.user_metadata?.user_name || user.email}</p>
                        <p>Last Refresh: {new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                {/* ─── Tab Navigation ────────────────────────────────── */}
                <div className="flex gap-1 mb-8 border-2 border-black dark:border-white/10 p-1 w-fit">
                    {(['overview', 'users', 'projects', 'deployments'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                                ? 'bg-black dark:bg-blue-600 text-white'
                                : 'hover:bg-gray-100 dark:hover:bg-white/10'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard icon={<Users size={20} />} label="Users" value={totalUsers} color="blue" />
                            <StatCard icon={<Layers size={20} />} label="Projects" value={totalProjects} color="indigo" />
                            <StatCard icon={<Rocket size={20} />} label="Deploys" value={totalDeployments} color="green" />
                            <StatCard icon={<FileCode size={20} />} label="Env Vars" value={totalEnvVars} color="yellow" />
                            <StatCard icon={<Key size={20} />} label="API Keys" value={totalApiKeys} color="purple" />
                            <StatCard icon={<Globe size={20} />} label="Domains" value={totalDomains} color="teal" />
                        </div>

                        {/* Status Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                                    <h3 className="font-black uppercase text-sm italic">Project Status</h3>
                                </div>
                                <div className="space-y-3">
                                    <StatusBar label="Live" count={liveProjects} total={totalProjects} color="bg-green-500" />
                                    <StatusBar label="Building" count={buildingProjects} total={totalProjects} color="bg-yellow-500" />
                                    <StatusBar label="Failed" count={failedProjects} total={totalProjects} color="bg-red-500" />
                                    <StatusBar label="Idle" count={totalProjects - liveProjects - buildingProjects - failedProjects} total={totalProjects} color="bg-gray-400" />
                                </div>
                            </div>

                            <div className="p-6 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                                    <h3 className="font-black uppercase text-sm italic">Platform Breakdown</h3>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                                        <StatusBar key={platform} label={platform} count={count} total={totalProjects}
                                            color={platform === 'vercel' ? 'bg-black dark:bg-white' : platform === 'netlify' ? 'bg-teal-500' : platform === 'vps' ? 'bg-orange-500' : 'bg-purple-500'}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Deploys */}
                        <div className="p-6 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                            <h3 className="font-black uppercase text-sm italic mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-blue-600 dark:text-blue-400" />
                                Recent Deployments
                            </h3>
                            <div className="space-y-2">
                                {data.deployments.slice(0, 10).map(d => {
                                    const proj = data.projects.find(p => p.id === d.project_id);
                                    const owner = data.users.find(u => u.id === proj?.user_id);
                                    return (
                                        <div key={d.id} className="flex items-center justify-between p-3 border-2 border-black/5 dark:border-white/5 hover:border-black dark:hover:border-blue-400 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <code className="text-[10px] font-mono text-gray-400">#{d.id.slice(0, 8)}</code>
                                                {statusBadge(d.status)}
                                                <span className="text-sm font-bold">{proj?.name || '—'}</span>
                                                <span className="text-[10px] text-gray-400">by {owner?.github_username || owner?.email || '—'}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono">{timeAgo(d.created_at)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════ USERS TAB ═══════════════ */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{totalUsers} registered user{totalUsers !== 1 ? 's' : ''}</p>
                        {data.users.map(u => {
                            const userProjects = projectsByUser[u.id] || [];
                            const isExpanded = expandedUsers.has(u.id);

                            return (
                                <div key={u.id} className="border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)]">
                                    <button
                                        onClick={() => toggleUser(u.id)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt="" className="w-10 h-10 border-2 border-black dark:border-white/20 object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 border-2 border-black dark:border-white/20 bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-sm">
                                                    {(u.github_username || u.email || '?')[0].toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-sm">{u.full_name}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">@{u.github_username}</span>
                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                    <span className="text-[10px] text-gray-400">{u.email}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-sm font-black">{userProjects.length}</p>
                                                <p className="text-[10px] text-gray-400 uppercase">projects</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-400">Joined {timeAgo(u.created_at)}</p>
                                                <p className="text-[10px] text-gray-400">Last login {timeAgo(u.last_sign_in_at)}</p>
                                            </div>
                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t-2 border-black/10 dark:border-white/10 p-5 space-y-3 bg-gray-50/50 dark:bg-white/[0.01]">
                                            {userProjects.length === 0 ? (
                                                <p className="text-xs text-gray-400 italic">No projects</p>
                                            ) : userProjects.map(p => (
                                                <div key={p.id} className="flex items-center justify-between p-3 border-2 border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03]">
                                                    <div className="flex items-center gap-3">
                                                        {platformIcon(p.platform)}
                                                        <Link href={`/projects/${p.id}`} className="font-bold text-sm hover:underline">{p.name}</Link>
                                                        {statusBadge(p.status)}
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[10px] text-gray-400">
                                                        <span>{(deploysByProject[p.id] || []).length} deploys</span>
                                                        <span>{envByProject[p.id] || 0} vars</span>
                                                        <span>{(domainsByProject[p.id] || []).length} domains</span>
                                                        {p.domain && (
                                                            <a href={p.domain} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                                                <ExternalLink size={10} /> visit
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ═══════════════ PROJECTS TAB ═══════════════ */}
                {activeTab === 'projects' && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{totalProjects} project{totalProjects !== 1 ? 's' : ''}</p>
                        {data.projects.map(p => {
                            const owner = data.users.find(u => u.id === p.user_id);
                            const deploys = deploysByProject[p.id] || [];
                            const envCount = envByProject[p.id] || 0;
                            const projectDomains = domainsByProject[p.id] || [];
                            const isExpanded = expandedProjects.has(p.id);

                            return (
                                <div key={p.id} className="border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)]">
                                    <button
                                        onClick={() => toggleProject(p.id)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            {platformIcon(p.platform)}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/projects/${p.id}`} className="font-bold text-sm hover:underline">{p.name}</Link>
                                                    {statusBadge(p.status)}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    by @{owner?.github_username || '—'} • {p.platform} • created {timeAgo(p.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-[10px] text-gray-400">
                                            <div className="text-center">
                                                <p className="font-black text-sm text-black dark:text-white">{deploys.length}</p>
                                                <p>deploys</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-sm text-black dark:text-white">{envCount}</p>
                                                <p>vars</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-sm text-black dark:text-white">{projectDomains.length}</p>
                                                <p>domains</p>
                                            </div>
                                            {isExpanded ? <ChevronDown size={16} className="text-black dark:text-white" /> : <ChevronRight size={16} className="text-black dark:text-white" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t-2 border-black/10 dark:border-white/10 p-5 space-y-4 bg-gray-50/50 dark:bg-white/[0.01]">
                                            {/* Project details */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400">Domain</p>
                                                    <p className="font-mono mt-1">{p.domain ? <a href={p.domain} target="_blank" className="text-blue-600 hover:underline">{p.domain}</a> : '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400">Platform</p>
                                                    <p className="font-mono mt-1 capitalize">{p.platform}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400">Project ID</p>
                                                    <p className="font-mono mt-1 text-[10px] text-gray-500">{p.id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400">Owner</p>
                                                    <p className="font-mono mt-1">{owner?.email || '—'}</p>
                                                </div>
                                            </div>

                                            {/* Custom domains */}
                                            {projectDomains.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Custom Domains</p>
                                                    {projectDomains.map((d: any) => (
                                                        <div key={d.id} className="inline-flex items-center gap-2 mr-3 mb-1 px-2 py-1 bg-white dark:bg-white/[0.03] border border-black/10 dark:border-white/10 text-xs font-mono">
                                                            {d.ssl_status === 'active' ? <CheckCircle2 size={10} className="text-green-500" /> : <Clock size={10} className="text-yellow-500" />}
                                                            {d.domain}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Recent deploys */}
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Recent Deployments ({deploys.length})</p>
                                                <div className="space-y-1">
                                                    {deploys.slice(0, 5).map((d: any) => (
                                                        <div key={d.id} className="flex items-center gap-3 text-xs p-2 border border-black/5 dark:border-white/5">
                                                            <code className="text-[10px] text-gray-400">#{d.id.slice(0, 8)}</code>
                                                            {statusBadge(d.status)}
                                                            <span className="text-gray-400 text-[10px]">{timeAgo(d.created_at)}</span>
                                                            <Link href={`/projects/${p.id}/logs?deployId=${d.id}`} className="text-blue-600 dark:text-blue-400 text-[10px] hover:underline ml-auto">logs →</Link>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ═══════════════ DEPLOYMENTS TAB ═══════════════ */}
                {activeTab === 'deployments' && (
                    <div className="space-y-4">
                        <div className="flex gap-8 mb-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {totalDeployments} total • <span className="text-green-600">{successDeploys} success</span> • <span className="text-red-500">{failedDeploys} failed</span>
                            </div>
                        </div>
                        <div className="border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-2 p-3 bg-black dark:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">
                                <div className="col-span-2">ID</div>
                                <div className="col-span-2">Project</div>
                                <div className="col-span-2">Owner</div>
                                <div className="col-span-1">Platform</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-2">Time</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            {/* Table rows */}
                            {data.deployments.slice(0, 50).map((d, i) => {
                                const proj = data.projects.find(p => p.id === d.project_id);
                                const owner = data.users.find(u => u.id === proj?.user_id);
                                return (
                                    <div key={d.id} className={`grid grid-cols-12 gap-2 p-3 text-xs items-center ${i % 2 === 0 ? 'bg-white dark:bg-white/[0.01]' : 'bg-gray-50 dark:bg-white/[0.03]'} hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-colors`}>
                                        <div className="col-span-2 font-mono text-[10px] text-gray-400">#{d.id.slice(0, 12)}</div>
                                        <div className="col-span-2 font-bold truncate">
                                            {proj ? <Link href={`/projects/${proj.id}`} className="hover:underline">{proj.name}</Link> : '—'}
                                        </div>
                                        <div className="col-span-2 text-gray-500 truncate">@{owner?.github_username || '—'}</div>
                                        <div className="col-span-1 flex items-center gap-1">{proj && platformIcon(proj.platform)} <span className="capitalize text-[10px]">{proj?.platform || '—'}</span></div>
                                        <div className="col-span-1">{statusBadge(d.status)}</div>
                                        <div className="col-span-2 text-[10px] text-gray-400 font-mono">{new Date(d.created_at).toLocaleString()}</div>
                                        <div className="col-span-2 text-right">
                                            {proj && (
                                                <Link href={`/projects/${proj.id}/logs?deployId=${d.id}`} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">View Logs</Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
        indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30',
        green: 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/30',
        yellow: 'text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
        purple: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30',
        teal: 'text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-500/30',
    };

    return (
        <div className={`p-4 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)]`}>
            <div className={`mb-2 ${colorMap[color]}`}>{icon}</div>
            <p className="text-3xl font-black">{value}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">{label}</p>
        </div>
    );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return (
        <div>
            <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                <span>{label}</span>
                <span>{count} ({pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-white/10 border border-black/10 dark:border-white/10">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
