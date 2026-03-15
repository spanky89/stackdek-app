-- Add estimated_days column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_days NUMERIC(5,1);

-- Add comment
COMMENT ON COLUMN jobs.estimated_days IS 'Estimated days to complete the job (e.g., 2.5 days)';
