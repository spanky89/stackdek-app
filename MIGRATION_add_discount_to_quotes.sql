-- Add discount columns to quotes table
-- Run this in Supabase SQL Editor

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percentage', 'dollar'));

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN quotes.discount_type IS 'Type of discount: percentage or dollar';
COMMENT ON COLUMN quotes.discount_amount IS 'Discount amount (percentage value or dollar amount depending on discount_type)';
