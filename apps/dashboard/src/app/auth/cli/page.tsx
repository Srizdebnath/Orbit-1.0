'use client'
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams, useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const [status, setStatus] = useState('Verifying identity...');

  useEffect(() => {
    const approveCLI = async () => {
      // 1. Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // If not logged in, send to GitHub login, then return here
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo: window.location.href }
        });
        return;
      }

      if (!code) {
        setStatus('❌ Error: No handshake code provided.');
        return;
      }

      // 2. Approve the CLI code in your DB
      const { error } = await supabase
        .from('cli_auth')
        .update({ is_approved: true, user_id: user.id })
        .eq('code', code);

      if (error) {
        setStatus(`❌ Approval Failed: ${error.message}`);
      } else {
        setStatus('🚀 Authorized! You can now return to your terminal.');
        // Optional: Redirect to dashboard after 3 seconds
        setTimeout(() => router.push('/'), 3000);
      }
    };

    approveCLI();
  }, [code, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md p-10 border-4 border-black bg-white shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-6 underline decoration-blue-500">
          CLI AUTH
        </h1>
        <div className="font-mono text-sm space-y-4">
          <p className="bg-gray-100 p-2 border-2 border-black inline-block">
            HANDSHAKE: <span className="font-bold">{code || '---'}</span>
          </p>
          <div className="py-6 border-y-2 border-black border-dashed mt-4">
            <p className="text-lg font-bold">{status}</p>
          </div>
          <p className="text-[10px] text-gray-400 pt-4 uppercase tracking-widest">
            Orbit Security Protocol v1.0
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense for Next.js App Router searchParams
export default function CLIAuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}