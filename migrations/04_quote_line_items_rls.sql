-- Migration: Add RLS policies for quote_line_items
-- This was missing from the initial migration

-- Enable RLS for Quote Line Items
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view quote line items from their quotes" ON quote_line_items
  FOR SELECT USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert quote line items" ON quote_line_items
  FOR INSERT WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update quote line items" ON quote_line_items
  FOR UPDATE USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete quote line items" ON quote_line_items
  FOR DELETE USING (
    quote_id IN (
      SELECT id FROM quotes WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );
