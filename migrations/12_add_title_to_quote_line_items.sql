-- Migration: Add title/notes to quote_line_items and notes to job_line_items
-- Date: 2026-03-03
-- Purpose: Fix missing columns causing invoice creation bugs
-- - quote_line_items was missing title and notes
-- - job_line_items was missing notes
-- - CreateQuoteForm was trying to insert both fields but they didn't exist

-- ===================================
-- PART 1: Fix quote_line_items
-- ===================================

-- Add title column to quote_line_items (allow NULL for backwards compatibility)
ALTER TABLE quote_line_items 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add notes column to quote_line_items (allow NULL)
ALTER TABLE quote_line_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- For existing records without titles, use first 50 chars of description as title
UPDATE quote_line_items 
SET title = LEFT(description, 50)
WHERE title IS NULL OR title = '';

-- ===================================
-- PART 2: Fix job_line_items
-- ===================================

-- Add notes column to job_line_items (title already exists)
ALTER TABLE job_line_items 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ===================================
-- PART 3: Update trigger to copy notes
-- ===================================

-- Update the copy_quote_items_to_job function to include notes
CREATE OR REPLACE FUNCTION copy_quote_items_to_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if the job has a quote_id (created from a quote)
  IF NEW.quote_id IS NOT NULL THEN
    -- Copy all quote line items to job line items (including notes now)
    INSERT INTO job_line_items (job_id, title, description, quantity, unit_price, notes, sort_order)
    SELECT 
      NEW.id,                    -- new job's ID
      qli.title,                 -- copy title
      qli.description,           -- copy description
      qli.quantity,              -- copy quantity
      qli.unit_price,            -- copy unit price
      qli.notes,                 -- copy notes
      qli.sort_order             -- preserve sort order
    FROM quote_line_items qli
    WHERE qli.quote_id = NEW.quote_id
    ORDER BY qli.sort_order;
    
    -- Update job's estimate_amount to match quote line items total
    UPDATE jobs 
    SET estimate_amount = (
      SELECT COALESCE(SUM(quantity * unit_price), 0)
      FROM job_line_items
      WHERE job_id = NEW.id
    )
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- PART 4: Add comments
-- ===================================

COMMENT ON COLUMN quote_line_items.title IS 'Short title/name for the line item (e.g. "Deck Installation")';
COMMENT ON COLUMN quote_line_items.notes IS 'Additional notes or details for this line item';
COMMENT ON COLUMN job_line_items.notes IS 'Additional notes or details for this line item';

-- ===================================
-- Verification:
-- ===================================
-- SELECT id, title, description, notes FROM quote_line_items LIMIT 5;
-- SELECT id, title, description, notes FROM job_line_items LIMIT 5;
