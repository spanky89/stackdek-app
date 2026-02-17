-- Add invoice_token column for secure public sharing
-- Run this migration to enable the Send Invoice feature

-- Add token column
ALTER TABLE invoices
ADD COLUMN invoice_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Create index for fast lookups
CREATE INDEX idx_invoices_token ON invoices(invoice_token);

-- Generate tokens for existing invoices
UPDATE invoices
SET invoice_token = gen_random_uuid()
WHERE invoice_token IS NULL;

-- Make token required going forward
ALTER TABLE invoices
ALTER COLUMN invoice_token SET NOT NULL;
