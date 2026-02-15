-- Migration: Unified Line Items (Quote/Job/Invoice Redesign)
-- Date: 2026-02-15
-- Purpose: Add title field to line items + create job_line_items table

-- ===================================
-- PART 1: Add title to existing tables
-- ===================================

-- Add title column to quote_line_items (optional field)
ALTER TABLE quote_line_items 
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN quote_line_items.title IS 'Short item name (e.g., "Lawn Mowing"). If null, description is used as heading.';

-- Add title column to invoice_line_items (optional field)
ALTER TABLE invoice_line_items 
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN invoice_line_items.title IS 'Short item name (e.g., "Lawn Mowing"). If null, description is used as heading.';

-- Add deposit_paid_amount to invoices table (tracks quote deposit already paid)
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS deposit_paid_amount NUMERIC(10,2) DEFAULT 0;

COMMENT ON COLUMN invoices.deposit_paid_amount IS 'Deposit amount already paid via quote (subtracted from total owed)';

-- ===================================
-- PART 2: Create job_line_items table
-- ===================================

CREATE TABLE IF NOT EXISTS job_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE job_line_items IS 'Line items for jobs (allows editing during work)';
COMMENT ON COLUMN job_line_items.title IS 'Short item name (optional)';
COMMENT ON COLUMN job_line_items.description IS 'Detailed description of the line item';
COMMENT ON COLUMN job_line_items.sort_order IS 'Display order (allows reordering)';

-- ===================================
-- PART 3: Enable RLS for job_line_items
-- ===================================

ALTER TABLE job_line_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view job line items from their jobs
CREATE POLICY "Users can view job line items from their jobs" ON job_line_items
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert job line items
CREATE POLICY "Users can insert job line items" ON job_line_items
  FOR INSERT WITH CHECK (
    job_id IN (
      SELECT id FROM jobs WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

-- Policy: Users can update job line items
CREATE POLICY "Users can update job line items" ON job_line_items
  FOR UPDATE USING (
    job_id IN (
      SELECT id FROM jobs WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

-- Policy: Users can delete job line items
CREATE POLICY "Users can delete job line items" ON job_line_items
  FOR DELETE USING (
    job_id IN (
      SELECT id FROM jobs WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

-- ===================================
-- VERIFICATION QUERIES (run after migration)
-- ===================================

-- Check that title columns exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quote_line_items' AND column_name = 'title';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoice_line_items' AND column_name = 'title';

-- Check that deposit_paid_amount exists on invoices
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'deposit_paid_amount';

-- Check that job_line_items table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'job_line_items';

-- Check RLS policies on job_line_items
-- SELECT policyname FROM pg_policies WHERE tablename = 'job_line_items';
