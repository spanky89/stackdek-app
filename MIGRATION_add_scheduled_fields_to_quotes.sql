-- Add scheduled date and time fields to quotes table
ALTER TABLE quotes
ADD COLUMN scheduled_date date,
ADD COLUMN scheduled_time time;

COMMENT ON COLUMN quotes.scheduled_date IS 'Date for scheduled quote appointment';
COMMENT ON COLUMN quotes.scheduled_time IS 'Time for scheduled quote appointment';
