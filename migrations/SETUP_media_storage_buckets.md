# Setup Media Storage Buckets for Job Photo/Video Upload

**Issue:** Photo and video upload failing in Job Detail page  
**Cause:** Storage buckets `quote-videos` and `quote-photos` don't exist  
**Fix:** Create buckets in Supabase Dashboard

---

## Step-by-Step Fix

### 1. Go to Supabase Dashboard
https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/storage/buckets

### 2. Create `quote-videos` Bucket
Click **"New Bucket"**

**Settings:**
- Name: `quote-videos`
- Public: ✅ **Yes** (public access)
- File size limit: **200 MB**
- Allowed MIME types: `video/mp4, video/quicktime, video/x-msvideo`

**RLS Policy (allow users to manage their own company's videos):**
```sql
-- Policy: Users can upload videos for their company's quotes/jobs
CREATE POLICY "Users can upload videos for their company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-videos' AND
  (auth.uid() IN (
    SELECT owner_id FROM companies 
    WHERE id = (storage.foldername(name))[1]
  ))
);

-- Policy: Users can view videos for their company
CREATE POLICY "Users can view their company videos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'quote-videos');

-- Policy: Users can delete videos for their company
CREATE POLICY "Users can delete their company videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-videos' AND
  (auth.uid() IN (
    SELECT owner_id FROM companies 
    WHERE id = (storage.foldername(name))[1]
  ))
);
```

### 3. Create `quote-photos` Bucket
Click **"New Bucket"**

**Settings:**
- Name: `quote-photos`
- Public: ✅ **Yes** (public access)
- File size limit: **10 MB**
- Allowed MIME types: `image/jpeg, image/png, image/heic`

**RLS Policy (allow users to manage their own company's photos):**
```sql
-- Policy: Users can upload photos for their company's quotes/jobs
CREATE POLICY "Users can upload photos for their company"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-photos' AND
  (auth.uid() IN (
    SELECT owner_id FROM companies 
    WHERE id = (storage.foldername(name))[1]
  ))
);

-- Policy: Users can view photos for their company
CREATE POLICY "Users can view their company photos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'quote-photos');

-- Policy: Users can delete photos for their company
CREATE POLICY "Users can delete their company photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-photos' AND
  (auth.uid() IN (
    SELECT owner_id FROM companies 
    WHERE id = (storage.foldername(name))[1]
  ))
);
```

---

## Quick Setup (Simplified - No RLS)

**If you want to skip RLS policies for now and just get it working:**

### Create Buckets Only:
1. Go to Storage → Buckets
2. Create `quote-videos` bucket → Public: **Yes**
3. Create `quote-photos` bucket → Public: **Yes**

**That's it!** Upload will work immediately.

**Security Note:** Without RLS policies, any authenticated user can upload/delete any file. Fine for single-user testing, but add RLS before multi-user launch.

---

## Verify It Works

1. Go to Job Detail page (any job)
2. Click "Notes" tab
3. Click "Upload Video" or "Add Photos"
4. Select a file
5. Should upload successfully

**Expected behavior:**
- Progress indicator shows "Uploading..."
- Success alert: "Video uploaded successfully!" or "X photos uploaded!"
- Video/photo appears in the page

**If still failing:**
- Check browser console for errors
- Verify bucket names are exactly `quote-videos` and `quote-photos` (case-sensitive)
- Check Supabase project URL matches `.env` file

---

## File Structure

Uploaded files organized by quote/job ID:

```
quote-videos/
  {quote_id or job_id}/
    1709827364_a7b2c9.mp4
    1709827821_d4f1e3.mov

quote-photos/
  {quote_id or job_id}/
    1709827400_x9y2z1.jpg
    1709827450_k3l4m5.png
```

---

## Database Schema (Already Exists)

Jobs and quotes tables already have columns for media:
- `video_url` (text) - stores public URL
- `photos` (jsonb) - stores array: `[{url, caption, order}]`

No migration needed for database.

---

## Testing Checklist

- [ ] Create both buckets in Supabase
- [ ] Set public access on both
- [ ] Go to Job Detail → Notes tab
- [ ] Upload a test video (small file)
- [ ] Upload 2-3 test photos
- [ ] Add captions to photos
- [ ] Delete a photo
- [ ] Delete the video
- [ ] Verify files removed from storage

---

## Cost Estimate

**Supabase Storage Pricing (Free Tier):**
- 1 GB storage (free)
- 2 GB bandwidth/month (free)

**Typical Usage:**
- Video: 20-50 MB each (2-3 min at 1080p)
- Photos: 1-3 MB each
- 50 jobs with media = ~1-2 GB storage

**Conclusion:** Free tier should handle 20-50 jobs/month easily.

---

## Done!

After creating the buckets:
✅ Photo upload will work  
✅ Video upload will work  
✅ Delete functions will work  
✅ Media shows up in Job Detail → Notes tab

**Time to fix:** 5 minutes
