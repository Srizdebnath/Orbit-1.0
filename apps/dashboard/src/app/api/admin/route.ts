import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// This route uses the SERVICE ROLE KEY (server-side only, never exposed to client)
// to bypass RLS and fetch all users' data for the admin panel.

const ADMIN_GITHUB_USERNAME = 'Srizdebnath';

export async function GET(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!serviceRoleKey) {
            return NextResponse.json(
                { error: 'SUPABASE_SERVICE_ROLE_KEY not configured in .env.local' },
                { status: 500 }
            );
        }

        // Verify the requester is the admin via their auth cookie
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const authClient = createClient(supabaseUrl, anonKey);

        // Extract auth token from cookie
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await authClient.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is the admin
        const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username || '';
        if (githubUsername.toLowerCase() !== ADMIN_GITHUB_USERNAME.toLowerCase()) {
            return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
        }

        // Use service role client to bypass RLS
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        // Fetch all data in parallel
        const [
            { data: allProjects },
            { data: allDeployments },
            { data: allEnvVars },
            { data: allApiKeys },
            { data: allDomains },
            { data: allMembers },
        ] = await Promise.all([
            adminClient.from('projects').select('*').order('created_at', { ascending: false }),
            adminClient.from('deployments').select('*').order('created_at', { ascending: false }).limit(200),
            adminClient.from('env_variables').select('id, project_id, key, created_at, updated_at'),
            adminClient.from('api_keys').select('id, user_id, name, key_prefix, created_at, expires_at, last_used_at'),
            adminClient.from('custom_domains').select('*'),
            adminClient.from('project_members').select('*'),
        ]);

        // Fetch unique users from auth.users via admin API
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

        // Build user map
        const usersMap: Record<string, any> = {};
        if (authUsers) {
            for (const u of authUsers) {
                usersMap[u.id] = {
                    id: u.id,
                    email: u.email,
                    github_username: u.user_metadata?.user_name || u.user_metadata?.preferred_username || '—',
                    avatar_url: u.user_metadata?.avatar_url || null,
                    full_name: u.user_metadata?.full_name || u.user_metadata?.name || '—',
                    created_at: u.created_at,
                    last_sign_in_at: u.last_sign_in_at,
                };
            }
        }

        return NextResponse.json({
            users: Object.values(usersMap),
            projects: allProjects || [],
            deployments: allDeployments || [],
            envVars: allEnvVars || [],
            apiKeys: allApiKeys || [],
            domains: allDomains || [],
            members: allMembers || [],
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
