-- Migration: Add DELETE policy for quotes table
-- Date: 2026-02-15
-- Purpose: Allow users to delete quotes from their own company

-- Add DELETE policy for quotes
CREATE POLICY "Users can delete quotes in their company" ON quotes
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quotes' 
    AND policyname = 'Users can delete quotes in their company'
  ) THEN
    RAISE NOTICE 'DELETE policy successfully created for quotes table';
  ELSE
    RAISE EXCEPTION 'DELETE policy was not created';
  END IF;
END $$;
