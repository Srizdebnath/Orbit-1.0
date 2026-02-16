'use client'
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LogsPage() {
  const params = useParams();
  const [logs, setLogs] = useState("Waiting for logs...");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!params.id) return;

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('deployments')
        .select('logs, status')
        .eq('project_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setLogs(data.logs);
        setStatus(data.status);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'deployments', 
          filter: `project_id=eq.${params.id}` 
        },
        (payload) => {
          setLogs(payload.new.logs);
          setStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Project ID: {params.id}</p>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase mt-2">Deployment Logs</h1>
        </div>
        <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase border-2 ${
          status === 'success' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-yellow-100 border-yellow-500 text-yellow-700'
        }`}>
          {status}
        </div>
      </div>

      <div className="relative group">
       
        <div className="absolute inset-0 bg-black translate-x-2 translate-y-2 group-hover:translate-x-3 group-hover:translate-y-3 transition-transform"></div>
        
        <div className="relative bg-[#0a0a0a] border-2 border-black p-6 font-mono text-sm leading-relaxed overflow-y-auto max-h-[600px] text-gray-300">
          <div className="flex gap-2 mb-4 border-b border-white/10 pb-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
          </div>
          
          {logs.split('\n').map((line, i) => (
            <div key={i} className="flex gap-4 hover:bg-white/5 transition-colors">
              <span className="opacity-20 w-8 shrink-0 text-right select-none">{i + 1}</span>
              <span className={line.includes('✅') ? 'text-green-400' : ''}>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}