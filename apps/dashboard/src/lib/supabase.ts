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

export interface EnvVariable {
  id: string;
  project_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CustomDomain {
  id: string;
  project_id: string;
  domain: string;
  ssl_status: 'pending' | 'active' | 'failed';
  verified: boolean;
  created_at: string;
}