-- Create Reminders table for task management
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view reminders from their company" ON reminders
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create reminders in their company" ON reminders
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update reminders in their company" ON reminders
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete reminders in their company" ON reminders
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Create index for faster queries
CREATE INDEX idx_reminders_company_id ON reminders(company_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
