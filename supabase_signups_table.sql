-- Run this in Supabase SQL Editor to create the signups table

CREATE TABLE IF NOT EXISTS signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  company_name text,
  user_id uuid REFERENCES auth.users(id),
  confirmed boolean DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Allow authenticated and anon users to insert (signup happens before confirmation)
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for everyone" ON signups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own signup" ON signups
  FOR SELECT USING (auth.uid() = user_id);

-- Optional: auto-update confirmed when user confirms email
-- This trigger listens to auth.users updates
CREATE OR REPLACE FUNCTION update_signup_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE signups
    SET confirmed = true, confirmed_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_confirmed ON auth.users;
CREATE TRIGGER on_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_signup_confirmed();
