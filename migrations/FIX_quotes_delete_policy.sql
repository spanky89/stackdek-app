-- FIX: Add missing DELETE policy for quotes table
-- Run this in Supabase SQL Editor
-- Date: 2026-02-15 04:30 AM EST

CREATE POLICY "Users can delete quotes in their company" ON quotes
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
