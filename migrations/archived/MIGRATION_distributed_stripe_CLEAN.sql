-- Migration: Add Distributed Stripe Support (CLEAN VERSION - NO POLICIES)
-- Run this in Supabase SQL editor

-- Add Stripe keys to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_keys 
ON companies(id) WHERE stripe_publishable_key IS NOT NULL;

-- Done
