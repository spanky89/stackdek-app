-- Add estimated_hours column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5,1);

-- Add comment
COMMENT ON COLUMN jobs.estimated_hours IS 'Estimated hours to complete the job (e.g., 4.5 hours)';
