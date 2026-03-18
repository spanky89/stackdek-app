-- Migration 15: Job Expenses (Receipt/Expense Tracking)
-- Employee expense submission with manager approval

CREATE TABLE IF NOT EXISTS job_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id),

  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'materials', 'equipment', 'subcontractors', 'permits', 'fuel', 'other'
  )),
  description TEXT,
  receipt_url TEXT, -- Supabase Storage path

  is_billable BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Storage bucket for receipts (create in Supabase dashboard):
-- Bucket name: job-receipts (private)
-- Path structure: {company_id}/{job_id}/{uuid}.jpg

CREATE INDEX IF NOT EXISTS idx_job_expenses_job ON job_expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_company ON job_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_job_expenses_added_by ON job_expenses(added_by);
CREATE INDEX IF NOT EXISTS idx_job_expenses_status ON job_expenses(status);

ALTER TABLE job_expenses ENABLE ROW LEVEL SECURITY;

-- Employees see only their own expenses; owners/managers see all
CREATE POLICY job_expenses_select ON job_expenses
  FOR SELECT
  USING (
    added_by = auth.uid()
    OR company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
  );

-- Employees can add expenses to jobs assigned to them
CREATE POLICY job_expenses_insert ON job_expenses
  FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND (
      -- Owner can always add
      company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
      OR
      -- Employee/Manager can add to assigned jobs
      job_id IN (
        SELECT ja.job_id FROM job_assignments ja
        JOIN team_members tm ON tm.id = ja.team_member_id
        WHERE tm.user_id = auth.uid()
      )
    )
  );

-- Only owners/managers can approve/reject (update status)
CREATE POLICY job_expenses_update ON job_expenses
  FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM companies WHERE user_id = auth.uid())
    OR company_id IN (
      SELECT company_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'manager'
    )
    OR (added_by = auth.uid() AND status = 'pending') -- employee can edit own pending
  );
