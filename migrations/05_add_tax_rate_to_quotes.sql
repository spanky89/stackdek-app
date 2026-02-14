-- Add tax_rate column to quotes table
ALTER TABLE quotes ADD COLUMN tax_rate NUMERIC(5,2) DEFAULT 0;
