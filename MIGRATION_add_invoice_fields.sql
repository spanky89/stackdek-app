-- Migration: Add tax_rate and notes to invoices table
-- Run this in Supabase SQL editor

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN invoices.tax_rate IS 'Tax percentage applied to the invoice (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN invoices.notes IS 'Optional notes or memo text for the invoice';
