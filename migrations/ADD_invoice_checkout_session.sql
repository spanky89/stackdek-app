-- Migration: Add Stripe Checkout Session ID to Invoices
-- Run this in Supabase SQL editor
-- Date: Feb 2026

-- Add stripe_checkout_session_id to track Checkout payments (separate from Stripe Invoice payments)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_invoices_checkout_session 
ON invoices(stripe_checkout_session_id) 
WHERE stripe_checkout_session_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN invoices.stripe_checkout_session_id IS 'Stripe Checkout session ID (cs_...) when paid via Checkout (not Stripe Invoice)';

-- Note: Invoices can be paid via two methods:
--   1. Stripe Checkout → stores stripe_checkout_session_id
--   2. Stripe Invoice → stores stripe_invoice_id
-- Both set status='paid' and paid_date when completed
