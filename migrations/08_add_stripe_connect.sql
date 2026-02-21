-- Add Stripe Connect Account ID to companies table

ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected_account_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT CHECK (stripe_connect_status IN ('disconnected', 'connected', 'pending'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_connect ON companies(stripe_connected_account_id) WHERE stripe_connected_account_id IS NOT NULL;

-- Update RLS policies (already exist, but verify DELETE policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can delete their own company'
  ) THEN
    CREATE POLICY "Users can delete their own company" ON companies
      FOR DELETE USING (auth.uid() = owner_id);
  END IF;
END$$;

COMMENT ON COLUMN companies.stripe_connected_account_id IS 'Stripe Connect account ID (acc_xxx)';
COMMENT ON COLUMN companies.stripe_connect_status IS 'Connection status: disconnected, connected, pending';
COMMENT ON COLUMN companies.stripe_connected_at IS 'Timestamp when Stripe account was connected';
