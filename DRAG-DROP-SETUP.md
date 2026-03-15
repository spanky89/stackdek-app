# Drag-and-Drop Job Reordering - Setup

**Status:** Code deployed to Vercel ✅  
**Database migration:** ⚠️ REQUIRED before feature works

---

## ⚠️ RUN THIS MIGRATION FIRST

Before testing the drag-and-drop feature, run this SQL in Supabase:

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard  
Project: StackDek (duhmbhxlmvczrztccmus)

### 2. Run SQL Migration
Go to: SQL Editor → New Query

Copy/paste this SQL:

```sql
-- Add sort_order column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Set initial values: older jobs get lower numbers (higher priority)
UPDATE jobs 
SET sort_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as row_num
  FROM jobs
) sub
WHERE jobs.id = sub.id;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_sort_order ON jobs(company_id, sort_order);

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(company_id, status);
```

### 3. Click "Run"

Should see: **Success. No rows returned**

---

## ✅ What This Does

**Job Stack Structure:**
```
┌────────────────────────┐
│ IN PROGRESS (top)      │  ← Auto-floats to top, no drag handles
├────────────────────────┤
│ SCHEDULED (sortable)   │  ← Drag icon (≡), reorder freely
└────────────────────────┘
```

**Behavior:**
- **In Progress jobs:** Always at top, no sorting (just shows what's active)
- **Scheduled jobs:** Drag-and-drop to reorder priority
- **Completed jobs:** Disappear from stack (moved to invoices)
- **New jobs:** Added to bottom of Scheduled section

**How to Use:**
1. Click and hold the drag icon (≡) on any scheduled job
2. Drag up or down
3. Drop where you want it
4. Order saves automatically

**Works on:**
- ✅ Desktop (click + drag)
- ✅ Mobile (touch + hold + drag)

---

## 🧪 Testing Checklist

After running migration:

- [ ] Go to https://stackdek-app.vercel.app/stack
- [ ] See "In Progress" and "Scheduled" section headers
- [ ] Scheduled jobs have drag icons (≡)
- [ ] In Progress jobs do NOT have drag icons
- [ ] Drag a scheduled job up → saves order
- [ ] Refresh page → order persists
- [ ] Test on mobile (touch and hold)
- [ ] Create new job → appears at bottom of Scheduled

---

## 🐛 Troubleshooting

**Drag doesn't work?**
- Check browser console for errors
- Verify migration ran successfully in Supabase
- Check that `sort_order` column exists in jobs table

**Jobs not reordering?**
- Check network tab (should see UPDATE request to Supabase)
- Verify RLS policies allow updates to jobs table
- Try refreshing the page

**Order not persisting?**
- Check Supabase logs for errors
- Verify `sort_order` values are being saved (check database directly)

---

## 📊 Database Structure

**jobs table:**
```sql
sort_order INTEGER  -- 1, 2, 3, 4... (lower = higher priority)
```

**Query logic:**
```sql
ORDER BY 
  (status = 'in_progress') DESC,  -- In progress first
  sort_order ASC,                 -- Then by custom order
  created_at DESC                 -- Fallback
```

---

## 🚀 Ready to Test

1. ✅ Run migration in Supabase (above)
2. ✅ Wait ~30 seconds for Vercel deploy
3. ✅ Go to https://stackdek-app.vercel.app/stack
4. ✅ Test drag-and-drop!

---

**Questions? Check browser console or message Milo.**

🎯 This is the killer feature - the whole "pile of jobs" mental model. Let's make it shine.
