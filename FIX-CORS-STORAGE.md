# Fix CORS for Storage Upload (Photo/Video)

**Problem:** Photo/video upload fails with "Failed to upload photos" even though:
- Storage buckets exist (quote-photos, quote-videos)
- RLS policies are configured correctly (INSERT, SELECT, DELETE)
- User is authenticated

**Root Cause:** CORS (Cross-Origin Resource Sharing) not configured for storage buckets

---

## Quick Fix (2 minutes)

### Option 1: Supabase Dashboard (Recommended)

**Go to Storage Settings:**
https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/settings/storage

**Add Allowed Origins:**
```
https://stackdek-app.vercel.app
https://app.stackdek.com
http://localhost:5173
http://localhost:3000
```

**Click "Save"**

---

### Option 2: If No CORS UI Available

**Check current CORS configuration:**
```sql
SELECT * FROM storage.buckets WHERE id IN ('quote-photos', 'quote-videos');
```

**Update bucket configuration (if needed):**
```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/heic']::text[],
    file_size_limit = 10485760
WHERE id = 'quote-photos';

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo']::text[],
    file_size_limit = 52428800
WHERE id = 'quote-videos';
```

---

## Test After Fix

1. Go to app: https://stackdek-app.vercel.app
2. Login
3. Open any job → Notes tab
4. Click "Add Photos"
5. Select a small image (< 10MB)
6. Upload should work immediately

**Expected:** "X photo(s) uploaded successfully!" message

---

## Current Status

**Buckets Created:** ✅
- quote-photos (10MB limit, public)
- quote-videos (50MB limit, public)

**Policies Created:** ✅
- INSERT, SELECT, DELETE for authenticated users

**CORS:** ❌ Not configured (blocking uploads)

---

## Related Issues

This CORS issue is recurring across StackDek:
- Storage uploads (this issue)
- API calls from frontend
- Webhook callbacks

**Future:** Create centralized CORS configuration checklist for all Supabase features.

---

**After fixing CORS, update:** `stackdek-app/SPANKY-TODO.md` to mark storage buckets as complete.
