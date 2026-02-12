-- Migration: Add Stripe Payment Fields and Job Automation
-- Run this in Supabase SQL editor

-- Add Stripe fields to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP;

-- Add quote reference to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update invoices table for job/quote links and payment status
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;

-- Update invoices status constraint to include new statuses
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'awaiting_payment', 'paid', 'archived', 'sent', 'overdue', 'cancelled'));

-- Create index for faster stripe session lookups
CREATE INDEX IF NOT EXISTS idx_quotes_stripe_session ON quotes(stripe_checkout_session_id);

-- Create index for job-quote relationship
CREATE INDEX IF NOT EXISTS idx_jobs_quote_id ON jobs(quote_id);

-- Create index for invoice-job relationship  
CREATE INDEX IF NOT EXISTS idx_invoices_job_id ON invoices(job_id);

-- Create index for invoice-quote relationship
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id ON invoices(quote_id);

-- Add comment for documentation
COMMENT ON COLUMN quotes.deposit_amount IS 'Deposit amount required before job starts';
COMMENT ON COLUMN quotes.deposit_paid IS 'Whether deposit has been paid via Stripe or offline';
COMMENT ON COLUMN quotes.stripe_checkout_session_id IS 'Stripe checkout session ID for tracking payments';
COMMENT ON COLUMN jobs.quote_id IS 'Reference to the quote that created this job (if auto-created from deposit payment)';
COMMENT ON COLUMN jobs.completed_at IS 'Timestamp when job was marked as completed';
COMMENT ON COLUMN invoices.quote_id IS 'Reference to the quote this invoice was generated from';
