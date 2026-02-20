-- =====================================================
-- Welcome Email Trigger Setup
-- =====================================================
-- This migration sets up a database trigger that fires 
-- when a new user signs up, calling the Edge Function
-- to send a welcome email via Resend.
-- =====================================================

-- Create a function to call the Edge Function webhook
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function asynchronously
  PERFORM
    net.http_post(
      url := 'https://duhmbhxlmvczrztccmus.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'users',
        'record', jsonb_build_object(
          'id', NEW.id,
          'email', NEW.email,
          'raw_user_meta_data', NEW.raw_user_meta_data
        ),
        'old_record', NULL
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trigger_welcome_email() TO postgres, anon, authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.trigger_welcome_email() IS 'Triggers welcome email via Edge Function when a new user signs up';
