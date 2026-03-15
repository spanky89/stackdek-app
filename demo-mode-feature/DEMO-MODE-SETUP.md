# Demo Mode Setup - Final Steps

## ✅ What I've Done:

1. **Created demo data file** → `src/data/demoData.json`
   - 5 sample contacts (contractors/homeowners)
   - 3 jobs (Deck Repair, Spring Cleanup, Patio Install)
   - 2 quotes
   - 1 invoice
   - 3 tasks

2. **Created seeder utility** → `src/utils/seedDemoData.ts`
   - `seedDemoData(companyId)` - populates demo data
   - `clearDemoData(companyId)` - removes all demo data

3. **Created demo banner component** → `src/components/DemoBanner.tsx`
   - Shows "This is demo data" message
   - Has "Clear Demo Data" button
   - Only shows when `is_demo_mode = true`

4. **Created demo mode hook** → `src/hooks/useDemoMode.ts`
   - Checks if company has data
   - Auto-seeds demo data if empty
   - Returns `isDemoMode` state

5. **Created SQL migration** → `migrations/14_add_demo_mode.sql`
   - Adds `is_demo_mode` column to companies table

6. **Updated Home.tsx** → `src/pages/Home.tsx`
   - Added imports for DemoBanner and useDemoMode
   - Shows banner when in demo mode

---

## ⚠️ What YOU Need to Do:

### Step 1: Run the SQL Migration (5 minutes)

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Go to SQL Editor
3. Copy/paste this SQL:

\`\`\`sql
-- Add demo mode flag to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo_mode BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_demo_mode ON companies(is_demo_mode);
\`\`\`

4. Click "Run"
5. ✅ Confirm it says "Success"

### Step 2: Test Demo Data Seeding (10 minutes)

1. **Create a fresh test account:**
   - Go to https://stackdek-app.vercel.app
   - Sign up with a NEW email (test+demo@youremail.com)
   - Complete signup

2. **Check if demo data appears:**
   - After login, you should see:
     - ✅ 5 contacts in your clients list
     - ✅ 3 jobs in your job stack
     - ✅ Blue banner at top: "This is demo data"
   
3. **If demo data DOESN'T appear:**
   - Open browser console (F12)
   - Look for errors
   - Check if `is_demo_mode` column exists in Supabase
   - Message me and I'll debug

4. **Test clearing demo data:**
   - Click "Clear Demo Data" button
   - Confirm the popup
   - ✅ All demo data should disappear
   - ✅ Banner should disappear
   - Dashboard should be empty

### Step 3: Deploy to Vercel (2 minutes)

Once testing looks good:

\`\`\`bash
cd C:\\Users\\x\\.openclaw\\workspace\\stackdek-app
git add .
git commit -m "Add demo mode with auto-seeding on signup"
git push
\`\`\`

Vercel will auto-deploy. Wait ~2 minutes for build.

---

## 🎥 Next: Record Onboarding Video

Once demo mode is working, record your video:

### Recording Setup:

1. **Use Loom** (easiest):
   - Go to loom.com
   - Install Chrome extension
   - Click "Record" → "Screen + Camera"

2. **Populate your account first:**
   - Add 5-8 real landscaping jobs
   - Add a few quotes
   - Make it look "lived in"

3. **Record the walkthrough** (5 minutes):
   - Follow the script I gave you earlier
   - Keep it casual and authentic
   - Show the stack, quoting, mobile view

4. **Upload to YouTube:**
   - Upload as "Unlisted" (not public)
   - Copy the embed URL

5. **Add to app:**
   - Edit `src/pages/Home.tsx`
   - Add the OnboardingVideo component:

\`\`\`typescript
import { OnboardingVideo } from '../components/OnboardingVideo'

// Inside the return, below the demo banner:
{isDemoMode && companyId && (
  <>
    <DemoBanner companyId={companyId} />
    <OnboardingVideo videoUrl="YOUR_YOUTUBE_EMBED_URL" />
  </>
)}
\`\`\`

---

## 🐛 Troubleshooting:

**Demo data not appearing?**
- Check browser console for errors
- Verify migration ran in Supabase
- Check that `seedDemoData()` is being called (add console.log)

**Banner not showing?**
- Check `is_demo_mode` is `true` in companies table
- Verify `useDemoMode` hook is returning `isDemoMode = true`

**Clear demo not working?**
- Check browser console
- Verify foreign key constraints aren't blocking deletes
- May need to delete in reverse order (tasks → invoices → quotes → jobs → clients)

---

## 📋 Testing Checklist:

Before going live, test this flow:

- [ ] New user signs up
- [ ] Dashboard loads with 5 contacts, 3 jobs
- [ ] Demo banner shows at top
- [ ] User can click around, see quotes, tasks
- [ ] "Clear Demo Data" button works
- [ ] After clearing, dashboard is empty
- [ ] User can add their first real job
- [ ] No errors in console

---

## 🚀 Once This Works:

**You're ready to launch!**

Monday morning:
1. Hit those 50 contractor leads
2. They sign up → see demo data → understand the value
3. Close 5-10 trials

**The empty state problem is SOLVED.**

---

Questions? Problems? Message me and I'll debug with you.

✅ You've got this! 🚀
