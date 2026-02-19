-- First, check current constraint
-- Run this to see what's allowed:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'quotes'::regclass AND conname = 'quotes_status_check';

-- Drop the old constraint and add new one with 'scheduled'
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;

ALTER TABLE quotes ADD CONSTRAINT quotes_status_check 
  CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'declined', 'expired', 'scheduled'));
