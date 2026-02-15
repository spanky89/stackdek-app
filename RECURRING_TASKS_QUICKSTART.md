# Recurring Tasks - Quick Start Guide

## Apply in 5 Minutes

### Step 1: Database Migration
Run the SQL migration in Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste contents of `migrations/07_add_recurring_tasks.sql`
3. Click "Run"
4. Verify: No errors, 7 columns added successfully

### Step 2: Deploy Code
All TypeScript changes are already committed. Just deploy:

```bash
# Build and deploy (Vercel)
npm run build
vercel --prod

# Or if using Vite dev server
npm run dev
```

### Step 3: Test Basic Flow

1. **Create a recurring task:**
   - Go to Tasks → + New Task
   - Fill in title: "Weekly team standup"
   - Set priority and start date (today)
   - Toggle "🔁 Make this a recurring task"
   - Select "Weekly" pattern
   - Click "Create Task"

2. **Verify instances created:**
   - Go to task list
   - Should see 5-6 task instances with 🔁 icon
   - Each has due date 1 week apart

3. **Edit a recurring instance:**
   - Click any instance → Edit
   - Choose "Only this occurrence"
   - Change title, save
   - Verify only that one changed

4. **Delete test tasks:**
   - Click parent task (first one) → Edit → Delete
   - Choose "Delete all future occurrences"
   - Confirm deletion

### Step 4: Optional - Add Background Job

To continuously generate future instances, set up a daily cron:

**Option A: Supabase Edge Function**
```typescript
// supabase/functions/generate-recurring-tasks/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  )

  // Find templates with < 5 future instances
  const { data: templates } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_recurring', true)

  for (const template of templates || []) {
    // Count existing future instances
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('parent_task_id', template.id)
      .gte('due_date', new Date().toISOString())

    if ((count || 0) < 5) {
      // Generate more instances (use generateOccurrences from utils)
      // Insert new instances
    }
  }

  return new Response('OK')
})
```

**Option B: External Cron (GitHub Actions, cron-job.org, etc.)**
```yaml
# .github/workflows/recurring-tasks.yml
name: Generate Recurring Tasks
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM daily
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Call generation endpoint
        run: curl -X POST ${{ secrets.RECURRING_TASKS_ENDPOINT }}
```

## Files Changed

**New Files:**
- `migrations/07_add_recurring_tasks.sql` - DB schema
- `src/utils/recurringTasks.ts` - Helper functions
- `src/pages/TaskEdit.tsx` - Edit page component
- `RECURRING_TASKS_IMPLEMENTATION.md` - Full docs
- `RECURRING_TASKS_QUICKSTART.md` - This guide

**Modified Files:**
- `src/pages/CreateTask.tsx` - Added recurring options
- `src/pages/TaskList.tsx` - Added recurring indicator
- `src/pages/TaskDetail.tsx` - Added recurring info panel
- `src/App.tsx` - Added edit route

## Feature Checklist

✅ Recurring task toggle in creation modal  
✅ Frequency selector (daily, weekly, monthly, custom)  
✅ Interval input (every X days/weeks/months)  
✅ Start date required for recurring tasks  
✅ Optional end date  
✅ Optional occurrence count  
✅ Generate 5 future instances on creation  
✅ Recurring indicator (🔁) on task cards  
✅ Recurring info panel on task detail  
✅ Edit page with scope selector  
✅ "This occurrence" vs "All future" edit modes  
✅ Smart delete for recurring tasks  
✅ Database indexes for performance  

## Common Patterns

### Daily Task (Every Day)
- Pattern: Daily
- Interval: 1
- Use case: Daily standup, daily report

### Weekly Task (Every Week)
- Pattern: Weekly
- Interval: 1
- Use case: Weekly meeting, weekly review

### Bi-weekly Task (Every 2 Weeks)
- Pattern: Weekly
- Interval: 2
- Use case: Sprint planning, bi-weekly 1-on-1

### Monthly Task (Every Month)
- Pattern: Monthly
- Interval: 1
- Use case: Monthly report, billing cycle

### Custom Interval
- Pattern: Custom
- Interval: N (any number of days)
- Use case: "Every 10 days", "Every 45 days"

## Troubleshooting

**Issue:** Migration fails with "column already exists"
- **Fix:** Migration already applied, skip step 1

**Issue:** 🔁 icon not showing
- **Fix:** Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

**Issue:** Edit page not found (404)
- **Fix:** Verify TaskEdit.tsx imported in App.tsx, rebuild

**Issue:** Instances not generating
- **Fix:** Check console logs, verify start date is set

**Issue:** Can't edit recurring task
- **Fix:** Ensure migration applied, check `parent_task_id` column exists

## Next Steps

1. ✅ **Apply migration** (Step 1)
2. ✅ **Deploy code** (Step 2)
3. ✅ **Test feature** (Step 3)
4. 🔄 **Set up cron job** (Step 4, optional but recommended)
5. 📝 **Train users** (Show them the new toggle)
6. 📊 **Monitor usage** (Track how many recurring tasks are created)

---

**Questions?** Check `RECURRING_TASKS_IMPLEMENTATION.md` for full details.

**Status:** ✅ Ready to Ship
