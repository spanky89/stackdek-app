-- Fix: Add RLS policies for public quote access by ID
-- This allows anonymous users to view quotes shared via link

-- 1. Allow anonymous users to view quotes
CREATE POLICY "Public can view quotes" ON quotes
  FOR SELECT USING (true);

-- 2. Allow anonymous users to view line items for quotes
CREATE POLICY "Public can view quote line items" ON quote_line_items
  FOR SELECT USING (true);

-- Note: These are fully public SELECT policies
-- Anyone with a quote ID can view it
-- Consider adding quote_token column for more secure sharing (like invoices)
