-- Migration: Add is_admin flag to companies table
-- Created: 2026-02-16
-- Description: Adds boolean column to identify admin accounts for admin dashboard access

-- Add is_admin column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_companies_is_admin ON companies(is_admin) WHERE is_admin = TRUE;

-- Comment on the column for documentation
COMMENT ON COLUMN companies.is_admin IS 'Indicates if this company has admin dashboard access';
