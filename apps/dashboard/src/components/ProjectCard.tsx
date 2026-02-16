'use client'
import { Terminal, ExternalLink, Activity, Zap, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import MetricChart from './MetricChart';
import MetricDisplay from './MetricDisplay';

export default function ProjectCard({ project }: { project: any }) {
  const isDeploying = project.status === 'building' || project.status === 'deploying';

  return (
    <div className="group relative bg-white dark:bg-white/[0.03] border-[3px] border-black dark:border-white/10 p-0 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(59,130,246,0.3)] overflow-hidden">


      <div className={`py-2 px-4 border-b-[3px] border-black dark:border-white/10 flex justify-between items-center ${isDeploying ? 'bg-black dark:bg-blue-600 text-white' : 'bg-white dark:bg-white/[0.03] text-black dark:text-gray-100'}`}>
        <div className="flex items-center gap-2">
          <Zap size={14} className={isDeploying ? 'animate-pulse' : ''} />
          <span className="text-[10px] font-black uppercase tracking-widest italic">
            Node: {project.platform}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full border border-black dark:border-white/30 ${project.status === 'success' ? 'bg-black dark:bg-green-400' : 'bg-white dark:bg-gray-600'}`} />
          <span className="text-[10px] font-black uppercase tracking-tighter">{project.status}</span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">
              {project.name}
            </h3>
            <p className="text-[10px] font-mono text-gray-400 break-all truncate max-w-[200px]">
              {project.domain || 'pending-deployment.orbit'}
            </p>
          </div>
          <div className="flex gap-1">
            <Link href={`/projects/${project.id}`} className="p-2 border-2 border-black dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-blue-600 transition-all">
              <Terminal size={18} />
            </Link>
            <Link href={`/projects/${project.id}/settings`} className="p-2 border-2 border-black dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-blue-600 transition-all">
              <Settings size={18} />
            </Link>
            {project.domain && (
              <a href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`} target="_blank" className="p-2 border-2 border-black dark:border-white/10 hover:bg-black hover:text-white dark:hover:bg-blue-600 transition-all">
                <ExternalLink size={18} />
              </a>
            )}
          </div>
        </div>


        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-black/5 dark:border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Activity size={16} />
              <span className="text-[10px] font-black uppercase italic">CPU Telemetry</span>
            </div>
            <MetricDisplay projectId={project.id} type="cpu" />
          </div>

          <div className="bg-white dark:bg-transparent grayscale border border-black/10 dark:border-white/5 rounded overflow-hidden">
            <MetricChart projectId={project.id} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="border-2 border-black dark:border-white/10 p-2 text-center bg-gray-50 dark:bg-white/[0.03]">
            <p className="text-[8px] font-black uppercase text-gray-400">Memory</p>
            <MetricDisplay projectId={project.id} type="ram" />
          </div>
          <div className="border-2 border-black dark:border-white/10 p-2 text-center">
            <p className="text-[8px] font-black uppercase text-gray-400">Access</p>
            <div className="flex justify-center items-center gap-1">
              <Shield size={10} />
              <p className="text-[10px] font-bold uppercase">Private</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}