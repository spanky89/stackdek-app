-- Fix: Allow quotes to be deleted even if referenced by jobs
-- When a quote is deleted, set the job's quote_id to NULL instead of blocking the delete
-- Date: Feb 16, 2026 6:50 PM

-- Drop the existing foreign key constraint
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_quote_id_fkey;

-- Recreate it with ON DELETE SET NULL
-- This means: when a quote is deleted, set quote_id to NULL in any jobs that reference it
ALTER TABLE jobs
ADD CONSTRAINT jobs_quote_id_fkey 
FOREIGN KEY (quote_id) 
REFERENCES quotes(id) 
ON DELETE SET NULL;

-- Verify the constraint was updated
SELECT 
  conname AS constraint_name,
  confdeltype AS delete_action
FROM pg_constraint
WHERE conname = 'jobs_quote_id_fkey';

-- Delete action codes:
-- 'a' = NO ACTION (old behavior - blocks delete)
-- 'c' = CASCADE (would delete jobs too)
-- 'n' = SET NULL (new behavior - sets quote_id to NULL)
-- 'r' = RESTRICT (blocks delete)
