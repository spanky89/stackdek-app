-- Add scheduled date/time fields to quotes table
-- These track when you're scheduled to visit client to give quote (not yet quoted)

ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time TIME;

-- Create index for filtering scheduled quotes
CREATE INDEX IF NOT EXISTS idx_quotes_scheduled_date ON quotes(scheduled_date);

-- Add comments for documentation
COMMENT ON COLUMN quotes.scheduled_date IS 'Date scheduled to visit client for assessment/quote';
COMMENT ON COLUMN quotes.scheduled_time IS 'Time scheduled to visit client for assessment/quote';
