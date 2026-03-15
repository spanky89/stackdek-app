-- Add sort_order column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Set initial values: older jobs get lower numbers (higher priority)
UPDATE jobs 
SET sort_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as row_num
  FROM jobs
) sub
WHERE jobs.id = sub.id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_sort_order ON jobs(company_id, sort_order);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(company_id, status);
