# Video Notes Feature - Deployment Summary

**Deployed:** Feb 17, 2026, 3:00 AM EST  
**Commit:** 20ffdd6  
**Status:** ✅ Code deployed, ⚠️ Manual database/storage setup required

---

## What Was Built

### 1. Database Schema ✅
- Added `video_url` (TEXT) to quotes and jobs tables
- Added `photos` (JSONB) to quotes and jobs tables
- Migration file: `migrations/09_add_video_photo_columns.sql`

### 2. Supabase Storage Buckets 🔧 REQUIRED
**Setup instructions:** `migrations/SETUP_storage_buckets.md`

You need to create two storage buckets in Supabase:
- `quote-videos` (200 MB max per file)
- `quote-photos` (10 MB max per file)

Run the SQL commands in `SETUP_storage_buckets.md` in your Supabase SQL Editor.

### 3. MediaUpload Component ✅
- Created `src/components/MediaUpload.tsx`
- Handles video upload (mp4, mov, avi - 200 MB max)
- Handles photo upload (jpg, png, heic - 10 photos max, 10 MB each)
- Photo captions, delete, reorder
- Read-only mode for employees

### 4. Quote & Job Pages Updated ✅
- **QuoteDetail.tsx:** Added MediaUpload to Notes tab
- **JobDetail.tsx:** Added MediaUpload to Notes tab (with auto-delete on completion)
- Fetches and displays video_url and photos from database

### 5. Auto-Transfer Logic ✅
- **Stripe Webhook (`api/webhooks/stripe.ts`):** Transfers video_url and photos from quote → job when deposit is paid
- New jobs automatically inherit media from the original quote

### 6. Auto-Delete Logic ✅
- **JobDetail.tsx changeStatus():** When job status changes to "completed", deletes video and photos from Supabase Storage and sets video_url=null, photos=[]
- Keeps storage costs near zero

---

## Manual Steps Required

### Step 1: Apply Database Migration

Run this in Supabase SQL Editor:

```sql
-- Add video_url column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video_url column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add photos column (JSONB array) to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Add photos column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
```

### Step 2: Create Storage Buckets & Policies

**In Supabase Dashboard → Storage:**

1. Create two new buckets:
   - `quote-videos` (set to public)
   - `quote-photos` (set to public)

2. Run these SQL commands in Supabase SQL Editor:

```sql
-- Create quote-videos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quote-videos', 'quote-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create quote-photos bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quote-photos', 'quote-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for quote-videos
CREATE POLICY "Allow authenticated uploads to quote-videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-videos');

CREATE POLICY "Allow authenticated reads from quote-videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-videos');

CREATE POLICY "Allow authenticated deletes from quote-videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-videos');

-- Storage policies for quote-photos
CREATE POLICY "Allow authenticated uploads to quote-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'quote-photos');

CREATE POLICY "Allow authenticated reads from quote-photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'quote-photos');

CREATE POLICY "Allow authenticated deletes from quote-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'quote-photos');
```

3. Set file size limits in Supabase Dashboard → Storage → Settings:
   - `quote-videos`: 200 MB max
   - `quote-photos`: 10 MB max

### Step 3: Test the Feature

1. **Create a quote** with video and photos
2. **Convert to job** (pay deposit via Stripe test card: 4242 4242 4242 4242)
3. **Verify** video/photos transferred to job
4. **Mark job complete** → verify video/photos deleted from storage

---

## Feature Details

### Video Upload
- **Formats:** MP4, MOV, AVI
- **Size limit:** 200 MB (2-3 minutes at 1080p)
- **Location:** Quote/Job Notes tab
- **Behavior:** Replaces old video on new upload (auto-deletes old file)

### Photo Upload
- **Formats:** JPG, PNG, HEIC
- **Limit:** 10 photos per quote/job
- **Size:** 10 MB per photo
- **Features:** Caption support, delete individual photos, grid display

### Workflow
1. **Quote stage:** User uploads video/photos explaining the job details
2. **Quote → Job:** Video/photos auto-transfer when deposit is paid
3. **Job stage:** Crew can view video/photos for reference
4. **Completion:** Video/photos auto-delete when job marked "Complete"

### Storage Cost Estimate
- With auto-delete on completion: only active jobs store media
- Expected: 5-20 videos at a time (5-10 GB max)
- Cost: **$0-2/month** on Supabase free tier (1 GB included)

---

## Files Changed

**New Files:**
- `src/components/MediaUpload.tsx` (359 lines)
- `migrations/09_add_video_photo_columns.sql`
- `migrations/SETUP_storage_buckets.md`

**Modified Files:**
- `src/pages/QuoteDetail.tsx` - Added video/photo state and MediaUpload component
- `src/pages/JobDetail.tsx` - Added video/photo state, MediaUpload component, auto-delete logic
- `api/webhooks/stripe.ts` - Added video_url and photos transfer on job creation

**Build Status:** ✅ Passed (6.97s, no errors)

---

## Deployment Status

- ✅ Code pushed to GitHub (commit 20ffdd6)
- ✅ Vercel auto-deployment triggered
- 🔧 Database migration pending (manual step)
- 🔧 Storage buckets setup pending (manual step)
- ⏳ Feature ready for testing after manual steps complete

---

## Next Steps

1. Apply database migration
2. Create storage buckets and policies
3. Test full workflow (quote → job → complete)
4. Monitor storage usage
5. Consider adding in-app video recording (v1.2 feature)

---

**Questions or Issues?** Check:
- `migrations/SETUP_storage_buckets.md` for detailed setup
- `src/components/MediaUpload.tsx` for implementation details
- Supabase Storage documentation: https://supabase.com/docs/guides/storage
