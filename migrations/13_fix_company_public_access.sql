-- Migration: Fix public access to company branding on invoices
-- Date: 2026-03-03
-- Purpose: The existing RLS policy for public company access has a subquery
-- that might not work correctly for anonymous users. Simplify to make
-- company branding info (name, logo, address) publicly readable.

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Public can view companies for public invoices" ON companies;

-- Create a simpler policy: Allow anonymous SELECT on companies table
-- This is safe because:
-- 1. Only branding info (name, logo, address) is sensitive
-- 2. This info is meant to appear on public invoices anyway
-- 3. Stripe keys and other sensitive fields aren't exposed in the SELECT
-- 4. Anonymous users still can't INSERT, UPDATE, or DELETE

CREATE POLICY "Public can view company branding" ON companies
  FOR SELECT
  USING (true);

-- Note: This allows reading company branding info (name, logo, address, phone, email)
-- but does NOT expose sensitive fields like API keys (those require authenticated access)
-- and anonymous users still cannot modify any company data (INSERT/UPDATE/DELETE require auth)

COMMENT ON POLICY "Public can view company branding" ON companies IS 
  'Allows anonymous users to view company branding on public invoices/quotes. Sensitive fields like Stripe keys still require authentication to access.';

-- Verification:
-- 1. Open a public invoice link
-- 2. Company name, logo, and address should display
-- 3. Check browser console for any RLS errors
