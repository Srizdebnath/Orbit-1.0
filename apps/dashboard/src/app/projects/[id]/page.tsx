'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MetricChart from '@/components/MetricChart';
import MetricDisplay from '@/components/MetricDisplay';
import {
  Clock,
  ExternalLink,
  Settings,
  Terminal,
  History as HistoryIcon,
  Activity,
  Layers
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectOverview() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {

      const { data: p } = await supabase.from('projects').select('*').eq('id', id).single();
      setProject(p);

      const { data: d } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setDeployments(d || []);
      setLoading(false);
    };

    fetchData();


    const channel = supabase
      .channel(`project-view-${id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'deployments', filter: `project_id=eq.${id}` },
        () => fetchData()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, [id]);

  if (loading) return <div className="p-20 font-mono italic animate-pulse">SYNCING_ORBIT_DATA...</div>;
  if (!project) return <div className="p-20 font-bold text-red-500">PROJECT_NOT_FOUND</div>;

  return (
    <main className="min-h-screen pt-32 px-8 pb-20">
      <Navbar />

      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-4 border-black dark:border-white/10 pb-8 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Active Node</span>
              <span className="bg-black dark:bg-blue-600 text-white text-[10px] px-2 py-0.5 font-bold uppercase">{project.platform}</span>
            </div>
            <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">
              {project.name}<span className="text-blue-600 dark:text-blue-400">.</span>
            </h1>
          </div>

          <div className="flex gap-3">
            <Link href={`/projects/${id}/settings`} className="flex items-center gap-2 px-6 py-3 border-2 border-black dark:border-white/10 font-bold uppercase text-xs hover:bg-black hover:text-white dark:hover:bg-blue-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] bg-white dark:bg-white/[0.03]">
              <Settings size={16} /> Settings
            </Link>
            {project.domain && (
              <a href={project.domain} target="_blank" className="flex items-center gap-2 px-6 py-3 border-2 border-black dark:border-white/10 font-bold uppercase text-xs hover:bg-blue-600 hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(37,99,235,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] bg-white dark:bg-white/[0.03]">
                <ExternalLink size={16} /> Visit Site
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">


          <div className="lg:col-span-1 space-y-8">
            <div className="border-4 border-black dark:border-white/10 p-6 bg-white dark:bg-white/[0.03] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)]">
              <div className="flex items-center gap-2 mb-6 text-blue-600 dark:text-blue-400">
                <Activity size={20} />
                <h2 className="font-black uppercase italic text-lg tracking-tight">Live Telemetry</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                    <span>CPU Load</span>
                    <MetricDisplay projectId={project.id} type="cpu" />
                  </div>
                  <div className="h-20 grayscale border-2 border-black/5 dark:border-white/5">
                    <MetricChart projectId={project.id} />
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-dashed border-black/10 dark:border-white/10">
                  <div className="flex justify-between text-[10px] font-black uppercase">
                    <span>Active RAM</span>
                    <MetricDisplay projectId={project.id} type="ram" />
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 font-black uppercase tracking-widest text-sm mb-4">
              <HistoryIcon size={20} /> Deployment History
            </div>

            <div className="space-y-4">
              {deployments.map((d, i) => (
                <div key={d.id} className="group flex items-center justify-between border-2 border-black dark:border-white/10 p-5 bg-white dark:bg-white/[0.03] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] transition-all">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-gray-300 dark:text-gray-600">#{deployments.length - i}</span>
                      <Layers size={20} className={i === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'} />
                    </div>

                    <div>
                      <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-tighter">ID: {d.id.slice(0, 8)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs font-black uppercase italic ${d.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {d.status}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                          {new Date(d.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/projects/${id}/logs?deployId=${d.id}`}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white/10 font-black text-[10px] uppercase hover:bg-black hover:text-white dark:hover:bg-blue-600 transition-colors"
                  >
                    <Terminal size={14} /> View Logs
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}