-- Update quotes that are appointments (created from requests, no line items yet)
-- to 'scheduled' status

UPDATE quotes
SET status = 'scheduled'
WHERE status = 'pending'
  AND scheduled_date IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT quote_id 
    FROM quote_line_items 
    WHERE quote_id IS NOT NULL
  );
