-- Migration: Add StackDek Subscription Billing
-- Run this in Supabase SQL editor
-- This is for contractors paying YOU for StackDek access (separate from contractor payment flow)

-- Add subscription fields to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'none')),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days');

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status 
ON companies(subscription_status);

CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer 
ON companies(subscription_stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN companies.subscription_status IS 'StackDek subscription status: trial, active, past_due, canceled, none';
COMMENT ON COLUMN companies.subscription_plan IS 'Subscription plan: basic, pro, enterprise';
COMMENT ON COLUMN companies.subscription_stripe_customer_id IS 'Stripe customer ID for StackDek subscription (YOUR Stripe account)';
COMMENT ON COLUMN companies.subscription_stripe_subscription_id IS 'Stripe subscription ID for recurring billing';
COMMENT ON COLUMN companies.subscription_current_period_end IS 'Current billing period end date';
COMMENT ON COLUMN companies.trial_ends_at IS 'Trial expiration date (14 days from signup)';
