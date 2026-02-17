# Supabase Storage Buckets Setup

Run these commands in Supabase SQL Editor or via API:

## 1. Create Buckets

```sql
-- Create quote-videos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quote-videos', 'quote-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create quote-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quote-photos', 'quote-photos', true)
ON CONFLICT (id) DO NOTHING;
```

## 2. Set Storage Policies

```sql
-- Allow authenticated users to upload to quote-videos
CREATE POLICY "Allow authenticated uploads to quote-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-videos');

-- Allow authenticated users to read from quote-videos
CREATE POLICY "Allow authenticated reads from quote-videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-videos');

-- Allow authenticated users to delete from quote-videos
CREATE POLICY "Allow authenticated deletes from quote-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-videos');

-- Allow authenticated users to upload to quote-photos
CREATE POLICY "Allow authenticated uploads to quote-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-photos');

-- Allow authenticated users to read from quote-photos
CREATE POLICY "Allow authenticated reads from quote-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-photos');

-- Allow authenticated users to delete from quote-photos
CREATE POLICY "Allow authenticated deletes from quote-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-photos');
```

## File Size Limits

Set in Supabase Dashboard → Storage → Settings:
- **quote-videos**: 200 MB max per file
- **quote-photos**: 10 MB max per file

## Accepted MIME Types

- **quote-videos**: video/mp4, video/quicktime, video/x-msvideo
- **quote-photos**: image/jpeg, image/png, image/heic
