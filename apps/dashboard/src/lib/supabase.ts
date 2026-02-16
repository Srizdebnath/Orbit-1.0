import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export interface Project {
  id: string;
  name: string;
  platform: 'vercel' | 'netlify' | 'vps' | 'tunnel';
  status: 'idle' | 'building' | 'success' | 'failed';
  domain: string;
  user_id: string;
  created_at: string;
}

export interface Deployment {
  id: string;
  project_id: string;
  logs: string;
  status: string;
  created_at: string;
}