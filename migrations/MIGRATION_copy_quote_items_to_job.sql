-- Migration: Auto-copy quote line items to job line items
-- Date: 2026-02-15
-- Purpose: When a job is created from a quote, automatically copy quote_line_items to job_line_items

-- ===================================
-- PART 1: Create trigger function
-- ===================================

CREATE OR REPLACE FUNCTION copy_quote_items_to_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run if the job has a quote_id (created from a quote)
  IF NEW.quote_id IS NOT NULL THEN
    -- Copy all quote line items to job line items
    INSERT INTO job_line_items (job_id, title, description, quantity, unit_price, sort_order)
    SELECT 
      NEW.id,                    -- new job's ID
      qli.title,                 -- copy title (may be null)
      qli.description,           -- copy description
      qli.quantity,              -- copy quantity
      qli.unit_price,            -- copy unit price
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
-- PART 2: Create trigger on jobs table
-- ===================================

DROP TRIGGER IF EXISTS trigger_copy_quote_items_to_job ON jobs;

CREATE TRIGGER trigger_copy_quote_items_to_job
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION copy_quote_items_to_job();

-- ===================================
-- VERIFICATION
-- ===================================

-- To test this trigger:
-- 1. Create a quote with line items
-- 2. Create a job with that quote_id
-- 3. Check that job_line_items were created:
--    SELECT * FROM job_line_items WHERE job_id = '<your-job-id>';
--
-- To verify the trigger exists:
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trigger_copy_quote_items_to_job';

COMMENT ON FUNCTION copy_quote_items_to_job() IS 'Automatically copies quote line items to job line items when a job is created from a quote';
