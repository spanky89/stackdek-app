-- Add city and state fields to requests table
ALTER TABLE requests
ADD COLUMN client_city text,
ADD COLUMN client_state text;

COMMENT ON COLUMN requests.client_city IS 'City';
COMMENT ON COLUMN requests.client_state IS 'State';
