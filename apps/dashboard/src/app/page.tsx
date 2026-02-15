'use client'
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import { LayoutGrid, Rocket, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initDashboard = async () => {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 2. Fetch projects for this user
        const { data } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        setProjects(data || []);
      }
      setLoading(false);
    };

    initDashboard();

    // 3. Listen for real-time changes (New projects or status updates)
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProjects(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel) };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-mono uppercase tracking-widest animate-pulse">
      Initialising Orbit...
    </div>
  );

  if (!user) return (
    <main className="min-h-screen pt-32 px-8 flex flex-col items-center justify-center text-center">
      <Navbar />
      <div className="max-w-xl p-12 border-4 border-black bg-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <ShieldCheck size={48} className="mx-auto mb-6 text-blue-600" />
        <h1 className="text-4xl font-black italic uppercase mb-4">Identity Required</h1>
        <p className="text-gray-500 mb-8 font-medium">To manage your fleet and see real-time metrics, you need to sign in with your GitHub account.</p>
        <button 
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
          className="bg-black text-white px-8 py-4 text-sm font-bold uppercase tracking-widest hover:translate-x-1 hover:translate-y-1 transition-transform"
        >
          Login with GitHub
        </button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen pt-32 pb-20 px-8">
      <Navbar />
      
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Control Plane Active</span>
            </div>
            <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.8]">
              Your Fleet<span className="text-blue-600">.</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-gray-400 uppercase">Authenticated as</p>
            <p className="font-bold text-lg">{user.user_metadata.full_name || user.email}</p>
          </div>
        </div>

        {/* Dashboard Grid */}
        {projects.length === 0 ? (
          <div className="border-4 border-dashed border-black/10 py-32 flex flex-col items-center justify-center text-center">
            <Rocket size={48} className="text-gray-200 mb-4" />
            <h2 className="text-2xl font-black uppercase italic mb-2">No ships in orbit</h2>
            <p className="text-gray-400 max-w-xs mb-8">Ready to launch? Deploy your first project using the Orbit CLI.</p>
            <Link href="/setup" className="bg-black text-white px-6 py-3 font-bold text-xs uppercase tracking-widest">
              View Setup Guide
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            
            {/* Quick Deploy Card */}
            <div className="border-2 border-dashed border-black/20 p-6 flex flex-col items-center justify-center min-h-[300px] opacity-40 hover:opacity-100 transition-all cursor-help group">
              <LayoutGrid size={32} className="mb-4 group-hover:rotate-12 transition-transform" />
              <p className="font-bold text-sm uppercase tracking-widest italic">Waiting for command...</p>
              <code className="mt-2 text-[10px] bg-black text-white px-2 py-1">orbit deploy</code>
            </div>
          </div>
        )}
      </div>

      {/* Background Decoration */}
      <div className="fixed bottom-10 right-10 -z-10 opacity-5 select-none pointer-events-none">
        <h1 className="text-[20vw] font-black italic leading-none uppercase">Orbit</h1>
      </div>
    </main>
  );
}