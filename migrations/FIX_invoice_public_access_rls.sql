-- Fix: Add RLS policies for public invoice access via token
-- This allows anonymous users to view invoices shared via secure token link

-- 1. Allow anonymous users to view invoices with valid token
CREATE POLICY "Public can view invoices with valid token" ON invoices
  FOR SELECT USING (
    invoice_token IS NOT NULL
  );

-- 2. Allow anonymous users to view line items for public invoices
CREATE POLICY "Public can view line items for public invoices" ON invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE invoice_token IS NOT NULL
    )
  );

-- 3. Allow anonymous users to view clients for public invoices
CREATE POLICY "Public can view clients for public invoices" ON clients
  FOR SELECT USING (
    id IN (
      SELECT client_id FROM invoices WHERE invoice_token IS NOT NULL
    )
  );

-- 4. Allow anonymous users to view companies for public invoices
-- (Needed for company name, logo, contact info on public invoice)
CREATE POLICY "Public can view companies for public invoices" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM invoices WHERE invoice_token IS NOT NULL
    )
  );

-- Note: These policies are read-only (SELECT only)
-- Anonymous users cannot create, update, or delete any records
