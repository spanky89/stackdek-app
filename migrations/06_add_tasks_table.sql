-- Add Tasks table

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Tasks
CREATE POLICY "Users can view tasks from their company" ON tasks
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create tasks in their company" ON tasks
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update tasks in their company" ON tasks
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete tasks in their company" ON tasks
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
