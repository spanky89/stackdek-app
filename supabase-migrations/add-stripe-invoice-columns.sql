-- Add Stripe invoice tracking columns to invoices table
-- Run this in Supabase SQL Editor

-- Add stripe_invoice_id if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- Add amount_paid if it doesn't exist  
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

-- Add paid_at timestamp if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id 
ON invoices(stripe_invoice_id) 
WHERE stripe_invoice_id IS NOT NULL;

-- Add index for company + stripe invoice lookups (security + speed)
CREATE INDEX IF NOT EXISTS idx_invoices_company_stripe 
ON invoices(company_id, stripe_invoice_id) 
WHERE stripe_invoice_id IS NOT NULL;

-- Add stripe_connected_account_id to companies if missing
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT;

-- Index for webhook account lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_account 
ON companies(stripe_connected_account_id) 
WHERE stripe_connected_account_id IS NOT NULL;

COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe invoice ID (in_...) for tracking payments';
COMMENT ON COLUMN invoices.amount_paid IS 'Total amount paid in dollars (from Stripe)';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when invoice was marked paid';
COMMENT ON COLUMN companies.stripe_connected_account_id IS 'Stripe Connect account ID (acct_...)';
