-- Migration: Add subscription tier and Stripe fields to companies table
-- Purpose: Support Starter/Pro feature gating and Stripe subscription management
-- Date: February 19, 2026

-- Add subscription columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due', 'unpaid')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT, -- Stripe price ID (price_xxx)
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Create index for fast subscription lookups
CREATE INDEX IF NOT EXISTS idx_companies_subscription ON companies(subscription_tier, subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);

-- Add comments for documentation
COMMENT ON COLUMN companies.subscription_tier IS 'Subscription plan: starter (core CRM), pro (contracts, multi-user, job costing, marketing)';
COMMENT ON COLUMN companies.subscription_status IS 'Stripe subscription status: active, trialing, canceled, past_due, unpaid';

-- Note: Both tiers have unlimited clients and jobs
-- Feature gating is handled at application level (contracts, multi-user, job costing, marketing)
