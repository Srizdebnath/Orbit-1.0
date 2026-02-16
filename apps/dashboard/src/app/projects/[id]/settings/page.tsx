'use client'
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Trash2, UserPlus, Shield, AlertTriangle } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ProjectSettings() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  async function fetchProjectData() {
    const { data } = await supabase.from('projects').select('*').eq('id', id).single();
    setProject(data);
    const { data: mems } = await supabase.from('project_members').select('*').eq('project_id', id);
    setMembers(mems || []);
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

  if (!project) return null;

  return (
    <main className="min-h-screen pt-32 px-8 pb-20">
      <Navbar />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-12">Settings<span className="text-blue-600">.</span></h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-8">
            <div className="p-8 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-black uppercase mb-6 italic underline">General</h2>
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase">Project Name</label>
                <input 
                  className="w-full border-2 border-black p-3 font-mono text-sm focus:bg-blue-50 outline-none"
                  defaultValue={project.name}
                  onBlur={(e) => updateProject({ name: e.target.value })}
                />
              </div>
            </div>

            <div className="p-8 border-4 border-red-500 bg-red-50 shadow-[8px_8px_0px_0px_rgba(239,68,68,1)]">
              <div className="flex items-center gap-2 text-red-600 mb-4">
                <AlertTriangle size={20} />
                <h2 className="text-xl font-black uppercase italic">Danger Zone</h2>
              </div>
              <p className="text-xs font-bold mb-6 text-red-800 uppercase">Deleting this project will remove all associated telemetry data instantly.</p>
              <button 
                onClick={deleteProject}
                className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} /> Delete Project
              </button>
            </div>
          </section>

          <section className="p-8 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(37,99,235,1)]">
            <h2 className="text-xl font-black uppercase mb-6 italic underline">Team Access</h2>
            
            <form onSubmit={inviteMember} className="flex gap-2 mb-8">
              <input 
                type="email" 
                placeholder="teammate@email.com"
                className="flex-1 border-2 border-black p-2 text-sm font-mono outline-none focus:bg-blue-50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button className="bg-black text-white px-4 py-2 text-xs font-bold uppercase hover:bg-blue-600 transition-colors">
                <UserPlus size={16} />
              </button>
            </form>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border-2 border-black bg-gray-50">
                <span className="text-xs font-bold truncate pr-4 italic">You (Owner)</span>
                <Shield size={14} className="text-blue-600" />
              </div>
              {members.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center p-3 border-2 border-black group">
                  <span className="text-xs font-mono truncate pr-4">{m.user_email}</span>
                  <button className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}