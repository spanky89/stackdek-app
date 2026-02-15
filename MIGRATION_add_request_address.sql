-- Add address field to requests table
ALTER TABLE requests
ADD COLUMN client_address text;

COMMENT ON COLUMN requests.client_address IS 'Full address (street, city, state, zip)';
