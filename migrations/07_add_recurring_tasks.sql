-- Add recurring tasks functionality

-- Add recurring fields to tasks table
ALTER TABLE tasks
  ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'custom')),
  ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
  ADD COLUMN recurrence_end_date DATE,
  ADD COLUMN recurrence_count INTEGER,
  ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN recurrence_instance_date DATE;

-- Create index for parent task lookups
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_is_recurring ON tasks(is_recurring);

-- Comments for clarity
COMMENT ON COLUMN tasks.is_recurring IS 'True if this is a recurring task template';
COMMENT ON COLUMN tasks.recurrence_pattern IS 'Frequency: daily, weekly, monthly, or custom';
COMMENT ON COLUMN tasks.recurrence_interval IS 'Interval for recurrence (e.g., every 2 weeks = interval 2)';
COMMENT ON COLUMN tasks.recurrence_end_date IS 'Optional end date for recurrence';
COMMENT ON COLUMN tasks.recurrence_count IS 'Optional number of occurrences remaining';
COMMENT ON COLUMN tasks.parent_task_id IS 'Reference to parent recurring task if this is an instance';
COMMENT ON COLUMN tasks.recurrence_instance_date IS 'Date this instance was scheduled for (if it is a recurring instance)';
