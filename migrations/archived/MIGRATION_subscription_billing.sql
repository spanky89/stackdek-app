-- Migration: Add Subscription Billing (StackDek Platform Subscriptions)
-- Run this in Supabase SQL editor

-- Add subscription fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status 
ON companies(subscription_status);

CREATE INDEX IF NOT EXISTS idx_companies_subscription_expires 
ON companies(subscription_expires_at);

-- Add comments for documentation
COMMENT ON COLUMN companies.subscription_plan IS 'Subscription tier: basic (free), pro ($29/mo), premium ($99/mo)';
COMMENT ON COLUMN companies.subscription_status IS 'Current subscription status: active, inactive, canceled, past_due';
COMMENT ON COLUMN companies.subscription_stripe_customer_id IS 'Stripe Customer ID for StackDek platform billing (cus_...)';
COMMENT ON COLUMN companies.subscription_stripe_subscription_id IS 'Stripe Subscription ID (sub_...)';
COMMENT ON COLUMN companies.subscription_expires_at IS 'When the current subscription period ends';
COMMENT ON COLUMN companies.subscription_started_at IS 'When the subscription first became active';
COMMENT ON COLUMN companies.trial_ends_at IS 'Free trial expiration (if applicable)';

-- Set default trial period for existing companies (30 days from now)
UPDATE companies 
SET 
  trial_ends_at = NOW() + INTERVAL '30 days',
  subscription_status = 'active'
WHERE trial_ends_at IS NULL;
