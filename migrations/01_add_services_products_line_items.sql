-- Migration: Add Services, Products, and Deposit fields
-- Run this in Supabase SQL editor

-- Create Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add invoice_number and deposit_percentage columns to invoices if they don't exist
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC(5,2) DEFAULT 25.00,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- Rename 'amount' to 'total_amount' if needed (backup old data first)
-- This is a safe operation only if total_amount already exists from the ALTER above

-- Create Invoice Line Items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create Quote Line Items table (for consistency)
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for Services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services from their company" ON services
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create services in their company" ON services
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update services in their company" ON services
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete services in their company" ON services
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Enable RLS for Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view products from their company" ON products
  FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can create products in their company" ON products
  FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can update products in their company" ON products
  FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

CREATE POLICY "Users can delete products in their company" ON products
  FOR DELETE USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );

-- Enable RLS for Invoice Line Items
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice line items from their invoices" ON invoice_line_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert invoice line items" ON invoice_line_items
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update invoice line items" ON invoice_line_items
  FOR UPDATE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete invoice line items" ON invoice_line_items
  FOR DELETE USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE company_id IN (
        SELECT id FROM companies WHERE owner_id = auth.uid()
      )
    )
  );
