-- Migration: Add Distributed Stripe Support
-- Run this in Supabase SQL editor

-- Add Stripe keys to companies table (encrypted storage)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Create index for faster company Stripe lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_keys 
ON companies(id) WHERE stripe_publishable_key IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.stripe_publishable_key IS 'Company-specific Stripe publishable key (pk_...)';
COMMENT ON COLUMN companies.stripe_secret_key IS 'Company-specific Stripe secret key (sk_...) - store securely';
COMMENT ON COLUMN companies.stripe_webhook_secret IS 'Company-specific Stripe webhook secret (whsec_...)';

-- Note: Existing quote/job/invoice fields from MIGRATION_stripe_payment_flow.sql remain unchanged
