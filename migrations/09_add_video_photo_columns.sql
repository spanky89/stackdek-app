-- Add video and photo columns to quotes and jobs tables
-- Date: Feb 17, 2026, 3:00 AM

-- Add video_url column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video_url column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add photos column (JSONB array) to quotes table
-- Format: [{ url: string, caption: string, order: number }]
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Add photos column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Create Storage buckets via Supabase Dashboard or API:
-- 1. quote-videos (200 MB max per file, mp4/mov/avi)
-- 2. quote-photos (10 MB max per file, jpg/png/heic)

-- Storage RLS policies will be set via Supabase Dashboard
