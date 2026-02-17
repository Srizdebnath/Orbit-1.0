'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import {
    Key, Plus, Trash2, Copy, Check,
    Shield, Clock, AlertTriangle
} from 'lucide-react';

export default function ApiKeysPage() {
    const [user, setUser] = useState<any>(null);
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [expiryDays, setExpiryDays] = useState('0');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // The raw key is only shown once after creation
    const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                await fetchKeys(user.id);
            }
            setLoading(false);
        };
        init();
    }, []);

    async function fetchKeys(userId: string) {
        const { data } = await supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        setKeys(data || []);
    }

    async function createKey(e: React.FormEvent) {
        e.preventDefault();
        if (!user) return;
        setCreating(true);

        // Generate key client-side (same as CLI)
        const rawBytes = new Uint8Array(32);
        crypto.getRandomValues(rawBytes);
        const hexStr = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const rawKey = `orb_${hexStr}`;
        const keyPrefix = rawKey.slice(0, 12);

        // Hash with Web Crypto API
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const expiresAt = parseInt(expiryDays) > 0
            ? new Date(Date.now() + parseInt(expiryDays) * 86400000).toISOString()
            : null;

        const { error } = await supabase.from('api_keys').insert({
            user_id: user.id,
            name: newKeyName || 'default',
            key_prefix: keyPrefix,
            key_hash: keyHash,
            expires_at: expiresAt
        });

        if (!error) {
            setJustCreatedKey(rawKey);
            setNewKeyName('');
            setExpiryDays('0');
            setShowCreateForm(false);
            await fetchKeys(user.id);
        }
        setCreating(false);
    }

    async function revokeKey(keyId: string) {
        if (!user) return;
        if (!confirm('Revoke this API key? This cannot be undone.')) return;
        await supabase.from('api_keys').delete().eq('id', keyId);
        await fetchKeys(user.id);
    }

    function copy(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    function timeAgo(date: Date): string {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return `${Math.floor(days / 30)}mo ago`;
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center font-mono italic animate-pulse">LOADING_API_KEYS...</div>;
    if (!user) return (
        <main className="min-h-screen pt-40 px-8">
            <Navbar />
            <div className="max-w-xl mx-auto text-center">
                <Shield size={64} className="mx-auto mb-6 text-blue-600 dark:text-blue-400" />
                <h1 className="text-4xl font-black italic uppercase mb-4">Login Required</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">Sign in to manage API keys.</p>
                <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 font-bold uppercase tracking-widest hover:scale-105 transition-transform">Login with GitHub</button>
            </div>
        </main>
    );

    return (
        <main className="min-h-screen pt-32 px-8 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto">

                <div className="flex justify-between items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Key size={20} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">CI/CD Authentication</span>
                        </div>
                        <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">
                            API Keys<span className="text-blue-600 dark:text-blue-400">.</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => { setShowCreateForm(!showCreateForm); setJustCreatedKey(null); }}
                        className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-blue-600 text-white font-bold uppercase text-xs hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)]"
                    >
                        <Plus size={16} /> New Key
                    </button>
                </div>

                {/* Just-created key banner */}
                {justCreatedKey && (
                    <div className="mb-8 p-6 border-4 border-yellow-400 dark:border-yellow-500/50 bg-yellow-50 dark:bg-yellow-500/10 shadow-[8px_8px_0px_0px_rgba(234,179,8,1)] dark:shadow-[8px_8px_0px_0px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-3">
                            <AlertTriangle size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Copy your API key now — it won't be shown again!</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-black/30 border-2 border-black dark:border-white/10 font-mono text-sm">
                            <code className="flex-1 truncate select-all">{justCreatedKey}</code>
                            <button
                                onClick={() => copy(justCreatedKey, 'created')}
                                className="shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                            >
                                {copiedId === 'created' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                        <p className="mt-3 text-xs text-yellow-700 dark:text-yellow-400 font-mono">
                            Usage: <code className="font-bold">export ORBIT_TOKEN="{justCreatedKey}"</code>
                        </p>
                    </div>
                )}

                {/* Create form */}
                {showCreateForm && (
                    <form onSubmit={createKey} className="mb-8 p-6 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
                        <h3 className="text-sm font-black uppercase mb-4 italic">Create New API Key</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Key Name</label>
                                <input
                                    type="text"
                                    placeholder="ci-production"
                                    className="w-full border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03]"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Expires In (days)</label>
                                <select
                                    className="w-full border-2 border-black dark:border-white/10 p-2 text-sm font-mono outline-none focus:bg-blue-50 dark:focus:bg-blue-500/10 bg-white dark:bg-white/[0.03]"
                                    value={expiryDays}
                                    onChange={(e) => setExpiryDays(e.target.value)}
                                >
                                    <option value="0">Never</option>
                                    <option value="7">7 days</option>
                                    <option value="30">30 days</option>
                                    <option value="90">90 days</option>
                                    <option value="365">1 year</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full py-2 bg-black dark:bg-blue-600 text-white font-black uppercase text-xs tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Generating...' : 'Generate Key'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Keys list */}
                <div className="space-y-4">
                    {keys.length === 0 && !showCreateForm && (
                        <div className="text-center py-16 border-4 border-dashed border-black/10 dark:border-white/10">
                            <Key size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold uppercase italic text-gray-400 mb-2">No API Keys</p>
                            <p className="text-xs text-gray-400">Create a key to authenticate CI/CD pipelines</p>
                            <p className="text-xs text-gray-400 font-mono mt-2">CLI: <code>orbit token create</code></p>
                        </div>
                    )}

                    {keys.map((k: any) => {
                        const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
                        return (
                            <div key={k.id} className={`flex items-center justify-between p-5 border-2 ${isExpired ? 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5' : 'border-black dark:border-white/10 bg-white dark:bg-white/[0.03]'} group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] transition-all`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-10 h-10 flex items-center justify-center border-2 ${isExpired ? 'border-red-400 text-red-500' : 'border-black dark:border-white/10 text-blue-600 dark:text-blue-400'}`}>
                                        <Key size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{k.name}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <code className="text-[10px] font-mono text-gray-400">{k.key_prefix}...</code>
                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                            <span className={`text-[10px] font-black uppercase ${isExpired ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                                {isExpired ? 'Expired' : 'Active'}
                                            </span>
                                            <span className="text-gray-300 dark:text-gray-600">•</span>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {timeAgo(new Date(k.created_at))}
                                            </span>
                                            {k.expires_at && (
                                                <>
                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {isExpired ? 'Expired' : `Expires ${new Date(k.expires_at).toLocaleDateString()}`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => revokeKey(k.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase text-red-500 dark:text-red-400 border-2 border-red-500/30 dark:border-red-400/30 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <Trash2 size={12} /> Revoke
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* CLI hint */}
                <div className="mt-12 p-6 bg-gray-50 dark:bg-white/[0.03] border-2 border-dashed border-black/10 dark:border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">CLI Commands</p>
                    <div className="space-y-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                        <p><code className="text-blue-600 dark:text-blue-400">orbit token create</code> — Generate a new API key</p>
                        <p><code className="text-blue-600 dark:text-blue-400">orbit token list</code> — List all keys</p>
                        <p><code className="text-blue-600 dark:text-blue-400">orbit token revoke</code> — Revoke a key</p>
                    </div>
                </div>

            </div>
        </main>
    );
}
