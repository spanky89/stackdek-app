-- Migration: Add status column to quotes table if it doesn't exist
-- This is needed to track quote approval state and move approved quotes to jobs

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update any NULL status values to 'draft'
UPDATE quotes SET status = 'draft' WHERE status IS NULL;

-- Add an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- Add index for filtering approved quotes
CREATE INDEX IF NOT EXISTS idx_quotes_company_status ON quotes(company_id, status);
