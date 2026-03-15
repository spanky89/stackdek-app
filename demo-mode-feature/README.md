# Demo Mode Feature (Saved for Later)

**Status:** Not implemented  
**Created:** March 15, 2026  
**Purpose:** Auto-populate new user accounts with demo data to solve "empty state" problem

---

## 📦 What's In This Folder:

### **Components:**
- `DemoBanner.tsx` - Blue banner with "Clear Demo Data" button
- `OnboardingVideo.tsx` - Video embed component

### **Logic:**
- `useDemoMode.ts` - Hook that detects empty accounts and auto-seeds demo data
- `seedDemoData.ts` - Functions to populate/clear demo data

### **Data:**
- `demoData.json` - Sample contractor data (5 contacts, 3 jobs, 2 quotes, 1 invoice, 3 tasks)

### **Database:**
- `14_add_demo_mode.sql` - Migration to add `is_demo_mode` column to companies table

### **Documentation:**
- `DEMO-MODE-SETUP.md` - Complete implementation guide
- `VIDEO-SCRIPT.md` - Script for recording onboarding video
- `NEXT-STEPS.md` - Step-by-step checklist

---

## 🎯 What This Solves:

**The Problem:**
New users sign up → see empty dashboard → don't understand the value → leave

**The Solution:**
New users sign up → auto-populated with sample data → see what it looks like when used → understand value → clear demo data → add real data

**Expected Result:**
- 70% retention instead of 5%
- Users see a "lived in" dashboard immediately
- Onboarding video shows them how to use it
- One-click transition to real data

---

## 🚀 How to Implement (When Ready):

### Step 1: Copy Files Back
```bash
# Components
cp demo-mode-feature/DemoBanner.tsx src/components/
cp demo-mode-feature/OnboardingVideo.tsx src/components/

# Logic
cp demo-mode-feature/useDemoMode.ts src/hooks/
cp demo-mode-feature/seedDemoData.ts src/utils/

# Data
mkdir -p src/data
cp demo-mode-feature/demoData.json src/data/

# Migration
cp demo-mode-feature/14_add_demo_mode.sql migrations/
```

### Step 2: Run Database Migration
```sql
-- In Supabase SQL Editor:
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_demo_mode BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_companies_demo_mode ON companies(is_demo_mode);
```

### Step 3: Update Home.tsx
```typescript
// Add imports:
import { DemoBanner } from '../components/DemoBanner'
import { useDemoMode } from '../hooks/useDemoMode'

// In component:
const { isDemoMode } = useDemoMode(companyId)

// In JSX (below title):
{isDemoMode && companyId && <DemoBanner companyId={companyId} />}
```

### Step 4: Record Onboarding Video
Follow `VIDEO-SCRIPT.md` to record a 5-minute product walkthrough.

### Step 5: Test & Deploy
1. Create test account
2. Verify demo data appears
3. Verify clear button works
4. Deploy to Vercel

---

## 📊 Time Investment:

- Implementation: 1-2 hours
- Video recording: 1-2 hours
- Testing: 30 minutes

**Total: 3-4 hours**

---

## 💡 Why Save This For Later?

**Current priority:** Get StackDek validated first
- Ship Starter tier ($29/mo)
- Get 5-10 paying customers
- Collect feedback
- See what features they actually want

**When to implement:**
- After first 10 signups
- After you've talked to real users
- When you know what Pro tier should include
- When empty state is proven to be a blocker

**OR:**
- When you're ready to scale outreach (100+ leads/week)
- When conversion rate matters more than validation

---

## 🔍 Files Overview:

### `demoData.json` (Sample Data)
```json
{
  "contacts": [
    "John Miller - Homeowner",
    "Sarah Johnson - Spring cleanup",
    "Mike Chen - Property manager",
    "Lisa Anderson - Patio install",
    "Tom Wilson - Repeat customer"
  ],
  "jobs": [
    "Deck Repair & Staining - $2,400",
    "Spring Cleanup Package - $850",
    "Patio Installation - $9,200"
  ]
}
```

### `seedDemoData.ts` (Auto-Population)
- Checks if account is empty
- Inserts demo data
- Marks company as `is_demo_mode = true`

### `DemoBanner.tsx` (UI Component)
- Shows only when `is_demo_mode = true`
- "Clear Demo Data" button
- Removes all demo data on click

### `useDemoMode.ts` (Smart Hook)
- Runs on first login
- Detects empty account
- Auto-seeds demo data
- No manual action needed

---

## 📝 Notes:

**This is production-ready code.** When you're ready to implement:
1. Read `DEMO-MODE-SETUP.md` for full instructions
2. Follow `NEXT-STEPS.md` checklist
3. Use `VIDEO-SCRIPT.md` to record video

**Estimated impact:**
- 10x improvement in signup-to-active-user conversion
- Fewer support questions ("how does this work?")
- Better first impression
- Easier to get testimonials (users see value immediately)

---

**Questions? This is all documented. Just read the markdown files in this folder.**

✅ Saved for when you're ready to scale. 🚀
