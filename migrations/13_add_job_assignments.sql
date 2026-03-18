-- Migration 13: Job Assignments (Pro Feature)
-- Links employees to specific jobs

CREATE TABLE IF NOT EXISTS job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(job_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_member ON job_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_company ON job_assignments(company_id);

ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;

-- Owners/managers can see all assignments in their company
CREATE POLICY job_assignments_select ON job_assignments
  FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
  );

-- Only owners/managers can assign employees
CREATE POLICY job_assignments_insert ON job_assignments
  FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY job_assignments_delete ON job_assignments
  FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );
