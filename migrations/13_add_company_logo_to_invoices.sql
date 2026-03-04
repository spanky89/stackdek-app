-- Migration: Add company logo URL to invoices
-- Date: 2026-03-03
-- Purpose: Store company logo directly on invoice to avoid RLS issues on public invoices
-- The logo URL will be copied from companies table when invoice is created

-- Add company_logo_url column to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add company_name column while we're at it (for same reason)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Backfill existing invoices with current company logo and name
UPDATE invoices
SET 
  company_logo_url = companies.logo_url,
  company_name = companies.name
FROM companies
WHERE invoices.company_id = companies.id
  AND (invoices.company_logo_url IS NULL OR invoices.company_name IS NULL);

-- Add comments
COMMENT ON COLUMN invoices.company_logo_url IS 'Snapshot of company logo at time of invoice creation (avoids RLS issues on public invoices)';
COMMENT ON COLUMN invoices.company_name IS 'Snapshot of company name at time of invoice creation (avoids RLS issues on public invoices)';

-- Verification:
-- SELECT id, invoice_number, company_name, company_logo_url FROM invoices LIMIT 5;
