'use client'
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { Sun, Moon, Key } from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

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
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-black/5 dark:border-white/10 px-6 py-3 rounded-2xl shadow-sm dark:shadow-lg dark:shadow-black/20">
        <Link href="/" className="text-2xl font-black tracking-tighter italic hover:opacity-70 transition-opacity">
          ORBIT<span className="text-blue-600 dark:text-blue-400">.</span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Projects</Link>
          <Link href="/keys" className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"><Key size={14} /> Keys</Link>
          <Link href="/setup" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Setup</Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="no-transition relative w-11 h-11 flex items-center justify-center rounded-xl border-2 border-black/20 dark:border-white/20 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-100 dark:bg-white/10 cursor-pointer overflow-hidden"
            style={{ transition: 'border-color 0.2s, transform 0.2s' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Sun size={20} className="text-amber-500" />
            ) : (
              <Moon size={20} className="text-blue-400" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-4 border-l border-black/10 dark:border-white/10 pl-6">
              <button
                onClick={handleLogout}
                className="text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-400 hover:underline"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'github' })}
              className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-full text-xs font-bold hover:scale-105 transition-transform"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}