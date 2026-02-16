-- Add notes column to quotes table
-- Run this in Supabase SQL Editor

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN quotes.notes IS 'Internal notes about the quote';
