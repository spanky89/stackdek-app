-- Add demo mode flag to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo_mode BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_demo_mode ON companies(is_demo_mode);
