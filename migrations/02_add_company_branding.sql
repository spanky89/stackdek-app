-- Add branding columns to companies table (migration)
-- Run this in Supabase SQL editor if the columns don't exist yet

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS invoice_notes TEXT;
