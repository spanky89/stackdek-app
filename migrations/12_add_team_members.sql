-- Migration 12: Team Members (Pro Feature)
-- Creates team_members and team_invitations tables
-- Run in Supabase SQL editor

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL until invite accepted
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('owner', 'manager', 'employee')),
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Pending invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_company ON team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON team_invitations(company_id);

-- RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Owners/managers can view all team members in their company
CREATE POLICY team_members_select ON team_members
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM companies WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM team_members WHERE user_id = auth.uid() AND role IN ('manager')
    )
    OR user_id = auth.uid()
  );

-- Only owners can insert/update/delete team members
CREATE POLICY team_members_insert ON team_members
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY team_members_update ON team_members
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY team_members_delete ON team_members
  FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
  );

-- Invitations policies
CREATE POLICY team_invitations_select ON team_invitations
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY team_invitations_insert ON team_invitations
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
  );

CREATE POLICY team_invitations_update ON team_invitations
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR token IN (SELECT token FROM team_invitations WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );
