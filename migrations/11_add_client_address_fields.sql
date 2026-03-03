-- Add separate address fields to clients table
-- Migration: 11_add_client_address_fields.sql
-- Date: 2026-03-03

-- Add new address columns
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT;

-- Migrate existing address data (if possible)
-- This attempts to split "123 Main St, Cumming, GA 30040" format
-- If address doesn't match pattern, it stays in the address column
UPDATE clients
SET 
  street = CASE 
    WHEN address LIKE '%,%,%,%' THEN split_part(address, ',', 1)
    ELSE NULL 
  END,
  city = CASE 
    WHEN address LIKE '%,%,%,%' THEN TRIM(split_part(address, ',', 2))
    ELSE NULL 
  END,
  state = CASE 
    WHEN address LIKE '%,%,%,%' THEN TRIM(split_part(address, ',', 3))
    ELSE NULL 
  END,
  zip = CASE 
    WHEN address LIKE '%,%,%,%' THEN TRIM(split_part(address, ',', 4))
    ELSE NULL 
  END
WHERE address IS NOT NULL AND address LIKE '%,%,%,%';

-- Add comment
COMMENT ON COLUMN clients.street IS 'Service street address (e.g., 123 Main St)';
COMMENT ON COLUMN clients.city IS 'Service city (e.g., Cumming)';
COMMENT ON COLUMN clients.state IS 'Service state (e.g., Georgia or GA)';
COMMENT ON COLUMN clients.zip IS 'Service zip code (e.g., 30040)';

-- Note: The old 'address' column is kept for backward compatibility
-- New imports will use street/city/state/zip fields
