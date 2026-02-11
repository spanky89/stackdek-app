-- Add revenue_goal column to companies table
ALTER TABLE companies
ADD COLUMN revenue_goal INTEGER DEFAULT 100000;

-- This migration adds a revenue_goal column to store each company's monthly revenue target
-- The default is set to 100000 ($100k)
