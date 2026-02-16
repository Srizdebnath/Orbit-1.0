'use client'
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import TerminalView from '@/components/TerminalView';
import { ArrowLeft, Terminal as TerminalIcon } from 'lucide-react';
import Link from 'next/link';

function LogsContent() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const deployId = searchParams.get('deployId');
    const [logs, setLogs] = useState("Loading telemetry...");

    useEffect(() => {
        const fetchLogs = async () => {
            let query = supabase.from('deployments').select('logs').eq('project_id', id);

            if (deployId) {
                query = query.eq('id', deployId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(1);
            }

            const { data } = await query.single();
            if (data) setLogs(data.logs);
        };

        fetchLogs();


        if (!deployId) {
            const channel = supabase
                .channel(`live-logs-${id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deployments', filter: `project_id=eq.${id}` },
                    (payload) => setLogs(payload.new.logs))
                .subscribe();
            return () => { supabase.removeChannel(channel) };
        }
    }, [id, deployId]);

    return (
        <main className="min-h-screen pt-32 px-8">
            <Navbar />
            <div className="max-w-6xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <Link href={`/projects/${id}`} className="flex items-center gap-2 text-xs font-black uppercase hover:underline">
                        <ArrowLeft size={16} /> Back to Overview
                    </Link>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black uppercase italic text-sm">
                        <TerminalIcon size={18} /> Terminal Output
                    </div>
                </div>

                <div className="border-4 border-black dark:border-white/10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] bg-[#0a0a0a] p-2 rounded-none">
                    <TerminalView logs={logs} />
                </div>
                <p className="mt-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest text-right">
                    End of Stream // Orbit Engine v1.2
                </p>
            </div>
        </main>
    );
}

export default function LogsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LogsContent />
        </Suspense>
    )
}