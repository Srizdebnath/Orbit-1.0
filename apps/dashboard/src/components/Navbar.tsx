'use client'
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();

  
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh(); 
  };

  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/60 backdrop-blur-md border border-black/5 px-6 py-3 rounded-2xl shadow-sm">
        <Link href="/" className="text-2xl font-black tracking-tighter italic hover:opacity-70 transition-opacity">
          ORBIT<span className="text-blue-600">.</span>
        </Link>
        
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600 transition-colors">Projects</Link>
          <Link href="/setup" className="hover:text-blue-600 transition-colors">Setup</Link>
          
          {user ? (
            <div className="flex items-center gap-4 border-l border-black/10 pl-8">
               
              <button 
                onClick={handleLogout}
                className="text-xs font-bold uppercase tracking-widest text-red-500 hover:underline"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
              className="bg-black text-white px-5 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}