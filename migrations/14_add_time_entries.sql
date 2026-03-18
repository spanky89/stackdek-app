-- Migration 14: Time Entries (Clock In/Out)
-- Tracks employee time per job

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  clock_in TIMESTAMP NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMP,
  
  -- Calculated on clock_out (hours)
  hours_worked DECIMAL(10,2),
  labor_cost DECIMAL(10,2), -- hours × member hourly_rate at time of entry
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_member ON time_entries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_job ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Employees can see their own entries; owners/managers see all
CREATE POLICY time_entries_select ON time_entries
  FOR SELECT
  USING (
    team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Employees can insert their own time entries
CREATE POLICY time_entries_insert ON time_entries
  FOR INSERT
  WITH CHECK (
    team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
  );

-- Employees can update their own open entries (clock out); owners/managers can update all
CREATE POLICY time_entries_update ON time_entries
  FOR UPDATE
  USING (
    team_member_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
    OR company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );
