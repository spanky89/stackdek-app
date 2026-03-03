# Fix Photo/Video Upload - Quick Guide

**Problem:** Upload button doesn't work in Job Detail → Notes tab  
**Cause:** Storage buckets missing  
**Time to fix:** 5 minutes

---

## Quick Fix (3 Steps)

### 1. Go to Supabase Storage
https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/storage/buckets

### 2. Create First Bucket
Click **"New Bucket"**
- Name: `quote-videos`
- Public: **Yes** ✅
- File size limit: `200` (MB)
- Click "Create"

### 3. Create Second Bucket
Click **"New Bucket"** again
- Name: `quote-photos`
- Public: **Yes** ✅
- File size limit: `10` (MB)
- Click "Create"

---

## That's It!

**Test it:**
1. Open any job in the app
2. Click "Notes" tab
3. Click "Upload Video" or "Add Photos"
4. Select a file
5. Should upload successfully ✅

**If it works:** You'll see "Video uploaded successfully!" or "X photos uploaded!"

---

## What You Just Created

**quote-videos:** Stores job walkthrough videos (max 200 MB each)  
**quote-photos:** Stores job site photos (max 10 per job, 10 MB each)

Both are public buckets (files accessible via URL, no login required).

---

## Security (Optional - Can Do Later)

Right now anyone with the URL can access files. To lock it down to company owners only:

**Add RLS policies** (see full guide: `migrations/SETUP_media_storage_buckets.md`)

But for testing/launch, public buckets are fine. You can add security later.

---

## Done!

Once you create those 2 buckets, photo/video upload will work instantly. No code changes needed.

**Questions?** Check `SETUP_media_storage_buckets.md` for detailed guide with screenshots and SQL policies.
