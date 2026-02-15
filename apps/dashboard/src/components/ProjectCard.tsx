'use client'
import { Terminal, ExternalLink, Cpu, HardDrive } from 'lucide-react';
import Link from 'next/link';

export default function ProjectCard({ project }: { project: any }) {
  const isSuccess = project.status === 'success';
  const isDeploying = project.status === 'deploying' || project.status === 'building';

  return (
    <div className="group relative bg-white border-[3px] border-black p-5 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
      
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 block mb-1">
            {project.platform} target
          </span>
          <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">
            {project.name}
          </h3>
        </div>
        <div className="flex gap-1">
          <Link href={`/projects/${project.id}`} title="View Logs" className="p-2 border-2 border-transparent hover:border-black transition-all">
            <Terminal size={20} />
          </Link>
          <a href={`https://${project.domain}`} target="_blank" className="p-2 border-2 border-transparent hover:border-black transition-all">
            <ExternalLink size={20} />
          </a>
        </div>
      </div>

   
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 border border-black/10 p-2">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Cpu size={12} /> <span className="text-[10px] font-bold uppercase">CPU Load</span>
          </div>
          <p className="font-mono font-bold text-sm">-- %</p>
        </div>
        <div className="bg-gray-50 border border-black/10 p-2">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <HardDrive size={12} /> <span className="text-[10px] font-bold uppercase">RAM Usage</span>
          </div>
          <p className="font-mono font-bold text-sm">-- MB</p>
        </div>
      </div>

      {/* Footer Status */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-dotted border-black/10">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full border border-black/20 ${
            isSuccess ? 'bg-green-500' : isDeploying ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-xs font-black uppercase tracking-widest italic">
            {project.status}
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-400">
          ID: {project.id.split('-')[0]}
        </p>
      </div>
    </div>
  );
}