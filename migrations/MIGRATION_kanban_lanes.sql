-- Migration: Add Kanban lanes to jobs table
-- Enables drag-drop job stack workflow with upcoming/in_progress lanes

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS lane TEXT DEFAULT 'upcoming' CHECK (lane IN ('upcoming', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for efficient lane + order queries
CREATE INDEX IF NOT EXISTS idx_jobs_lane_order ON jobs(company_id, lane, order_index);

-- Migrate existing jobs to 'upcoming' lane if not completed
UPDATE jobs
SET lane = CASE 
  WHEN status = 'in_progress' THEN 'in_progress'
  WHEN status = 'completed' THEN 'completed'
  ELSE 'upcoming'
END
WHERE lane IS NULL OR lane = '';

-- Set order_index based on creation order within each lane
WITH ordered_jobs AS (
  SELECT id, company_id, lane,
    ROW_NUMBER() OVER (PARTITION BY company_id, lane ORDER BY created_at ASC) as row_num
  FROM jobs
)
UPDATE jobs
SET order_index = (SELECT row_num - 1 FROM ordered_jobs WHERE ordered_jobs.id = jobs.id)
WHERE order_index = 0;
