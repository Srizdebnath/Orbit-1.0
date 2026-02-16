'use client'
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import { Github, Linkedin, Globe, Rocket, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        setProjects(data || []);
      }
      setLoading(false);
    };
    init();

    const channel = supabase.channel('realtime-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload: any) => {
        if (payload.eventType === 'INSERT') setProjects(prev => [payload.new, ...prev]);
        if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      }).subscribe();

    return () => { supabase.removeChannel(channel) };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono italic">LOADING_ORBIT_PROTOCOL...</div>;

  return (
    <main className="min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto pt-40 px-8 pb-20">
        {!user ? (
          <div className="max-w-2xl mx-auto text-center p-12 border-4 border-black dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(59,130,246,0.3)]">
            <ShieldCheck size={64} className="mx-auto mb-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-5xl font-black italic uppercase mb-4">Identity Required</h1>
            <p className="mb-8 font-medium text-gray-600 dark:text-gray-400">To access the Orbit Control Plane, please authenticate with GitHub.</p>
            <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })} className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 font-bold uppercase tracking-widest hover:scale-105 transition-all">Login with GitHub</button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-16 border-b-4 border-black dark:border-white/10 pb-8">
              <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none">Your Fleet<span className="text-blue-600 dark:text-blue-400">.</span></h1>
              <div className="text-right font-mono">
                <p className="text-xs text-gray-400 uppercase">System Operator</p>
                <p className="font-bold">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {projects.map(project => <ProjectCard key={project.id} project={project} />)}
              <div className="border-4 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center p-12 opacity-40 hover:opacity-100 transition-all cursor-pointer group">
                <Rocket size={40} className="mb-4 group-hover:animate-bounce" />
                <p className="font-bold uppercase italic tracking-widest">orbit deploy</p>
              </div>
            </div>
          </>
        )}
      </div>


      <footer className="bg-white dark:bg-[#0a0a0f] border-t-4 border-black dark:border-white/10 py-20 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="w-40 h-40 border-4 border-black dark:border-white/10 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(59,130,246,0.3)] overflow-hidden">
            <img src="/pic.jpeg" alt="Dev" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <p className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mb-2 text-xs italic">DevOps and AI Automation Engineer | BlockChain and Full Stack Developer</p>
            <h2 className="text-6xl font-black uppercase italic tracking-tighter mb-6">Srizdebnath</h2>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <SocialLink href="https://github.com/Srizdebnath" icon={<Github />} label="GitHub" />
              <SocialLink href="https://linkedin.com/in/srizdebnath" icon={<Linkedin />} label="LinkedIn" />
              <SocialLink href="https://sriz.vercel.app" icon={<Globe />} label="Portfolio" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SocialLink({ href, icon, label }: any) {
  return (
    <a href={href} target="_blank" className="flex items-center gap-2 px-6 py-3 border-2 border-black dark:border-white/10 font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all bg-white dark:bg-white/[0.03]">
      {icon} {label}
    </a>
  );
}