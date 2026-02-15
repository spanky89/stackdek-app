# Database Backup Plan - Feb 15, 2026

## Before Running Migration

### Option 1: Supabase Dashboard Backup (Recommended)
1. Go to: https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus
2. Click "Database" → "Backups"
3. Click "Create Backup" (manual point-in-time backup)
4. Wait for confirmation (~30 seconds)

**Restore:** If migration fails, restore from this backup in the same menu.

---

### Option 2: SQL Export (Manual Fallback)
Run these queries in Supabase SQL Editor **before migration:**

```sql
-- Export existing quote_line_items structure
SELECT * FROM quote_line_items ORDER BY created_at;

-- Export existing invoice_line_items structure
SELECT * FROM invoice_line_items ORDER BY created_at;

-- Count existing records
SELECT 
  (SELECT COUNT(*) FROM quote_line_items) as quote_items,
  (SELECT COUNT(*) FROM invoice_line_items) as invoice_items;
```

Save results to CSV (Export button in SQL editor).

---

## Migration Safety Features

### Non-Destructive Changes ✅
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — won't fail if column already exists
- `CREATE TABLE IF NOT EXISTS` — won't fail if table already exists
- **No data deletion** — only adding columns and creating new table
- **No foreign key changes** — existing relationships untouched

### Backward Compatibility ✅
- `title` is optional (nullable) — existing records work without it
- Existing queries still work (description field unchanged)
- RLS policies additive (existing policies still active)

---

## Rollback Plan (if needed)

### If migration fails mid-execution:
1. **DO NOT PANIC** — additive changes are safe
2. Check Supabase logs for specific error
3. Fix the issue and re-run (IF NOT EXISTS protects against duplicates)

### If migration succeeds but app breaks:
```sql
-- Remove title columns (safe to drop, data loss for new titles only)
ALTER TABLE quote_line_items DROP COLUMN IF EXISTS title;
ALTER TABLE invoice_line_items DROP COLUMN IF EXISTS title;

-- Drop job_line_items table (only if no data added yet)
DROP TABLE IF EXISTS job_line_items;
```

### If you need full database restore:
- Supabase Dashboard → Database → Backups → Restore from backup

---

## Verification Steps (run after migration)

```sql
-- 1. Check quote_line_items has title column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quote_line_items' AND column_name = 'title';
-- Expected: title | text | YES

-- 2. Check invoice_line_items has title column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoice_line_items' AND column_name = 'title';
-- Expected: title | text | YES

-- 2b. Check invoices has deposit_paid_amount column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name = 'deposit_paid_amount';
-- Expected: deposit_paid_amount | numeric | YES | 0

-- 3. Check job_line_items table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'job_line_items';
-- Expected: job_line_items

-- 4. Check RLS policies on job_line_items
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'job_line_items';
-- Expected: 4 policies (view, insert, update, delete)

-- 5. Test inserting a job line item (replace JOB_ID with real job ID)
INSERT INTO job_line_items (job_id, title, description, quantity, unit_price, sort_order)
VALUES ('YOUR_JOB_ID_HERE', 'Test Item', 'Test description', 1, 50.00, 0)
RETURNING *;
-- Expected: Returns the new row

-- 6. Clean up test insert
DELETE FROM job_line_items WHERE title = 'Test Item';
```

---

## Risk Assessment: LOW ✅

**Why this migration is safe:**
- No destructive operations (ALTER/DROP on existing data)
- Uses IF NOT EXISTS guards
- Additive only (new columns, new table)
- Backward compatible (old code still works)
- Easy rollback (drop new columns/table)

**Potential issues (low probability):**
- RLS policy name conflicts (unlikely, unique names used)
- Foreign key constraint validation (should pass, jobs table exists)
- Permissions issues (your account should have full access)

---

## Ready to Apply?

**Step 1:** Create manual backup in Supabase Dashboard  
**Step 2:** Run `MIGRATION_unified_line_items.sql` in SQL Editor  
**Step 3:** Run verification queries to confirm success  
**Step 4:** Test locally before deploying to production  

---

*Migration created: Feb 15, 2026, 2:05 PM EST*
