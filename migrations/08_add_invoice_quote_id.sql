-- Migration: Add quote_id to invoices table
-- Allows tracking which quote an invoice originated from

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);

-- Add comment for documentation
COMMENT ON COLUMN invoices.quote_id IS 'Reference to the quote this invoice was generated from (if applicable)';
