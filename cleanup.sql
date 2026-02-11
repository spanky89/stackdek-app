-- Find the primary company (oldest, and belongs to the user)
WITH primary_company AS (
  SELECT id, owner_id 
  FROM companies 
  ORDER BY created_at ASC 
  LIMIT 1
)
-- Update ALL clients to point to the primary company
UPDATE clients 
SET company_id = (SELECT id FROM primary_company);

-- Delete all companies except the primary one
DELETE FROM companies 
WHERE id NOT IN (
  SELECT id FROM companies 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Verify
SELECT COUNT(*) as total_companies FROM companies;
SELECT COUNT(*) as total_clients FROM clients;
