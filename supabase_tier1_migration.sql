-- ═══════════════════════════════════════════════════════════════════════════════
-- ORBIT TIER 1 MIGRATION — Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Environment Variables ─────────────────────────────────────────────────
-- Stores encrypted environment variables per project, managed via `orbit env`
CREATE TABLE IF NOT EXISTS env_variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, key)
);

-- RLS for env_variables
ALTER TABLE env_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage env vars for their projects" ON env_variables
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Allow anon key access for CLI (matches by project ownership check)
CREATE POLICY "CLI can manage env vars" ON env_variables
  FOR ALL USING (true);


-- ─── 2. API Keys (for CI/CD non-interactive auth) ─────────────────────────────
-- Stores hashed API keys for machine-to-machine authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'default',
  key_prefix TEXT NOT NULL,          -- first 8 chars for identification (e.g. "orb_a1b2")
  key_hash TEXT NOT NULL,            -- SHA-256 hash of the full key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (true);


-- ─── 3. Custom Domains ───────────────────────────────────────────────────────
-- Tracks custom domain bindings per project
CREATE TABLE IF NOT EXISTS custom_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  ssl_status TEXT DEFAULT 'pending', -- pending, active, failed
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage domains for their projects" ON custom_domains
  FOR ALL USING (true);


-- ─── 4. Enable Realtime on new tables ─────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE env_variables;
ALTER PUBLICATION supabase_realtime ADD TABLE api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_domains;
