-- Migration: Add tax_amount column to quotes table
-- Date: 2026-02-15
-- Purpose: Allow direct tax amount entry (not just percentage-based)

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN quotes.tax_amount IS 'Direct tax amount (overrides tax_rate calculation if set)';
