# Recurring Tasks Implementation Guide

## Overview
This document describes the implementation of recurring tasks functionality in StackDek.

## Implementation Summary

### 1. Database Schema Changes
**File:** `migrations/07_add_recurring_tasks.sql`

Added the following columns to the `tasks` table:
- `is_recurring` (BOOLEAN) - Marks if this is a recurring task template
- `recurrence_pattern` (TEXT) - Pattern: 'daily', 'weekly', 'monthly', or 'custom'
- `recurrence_interval` (INTEGER) - Interval multiplier (e.g., every 2 weeks = 2)
- `recurrence_end_date` (DATE) - Optional end date for recurrence
- `recurrence_count` (INTEGER) - Optional number of occurrences
- `parent_task_id` (UUID) - References parent recurring task if this is an instance
- `recurrence_instance_date` (DATE) - Scheduled date for this instance

### 2. Utility Functions
**File:** `src/utils/recurringTasks.ts`

Created helper functions:
- `getNextOccurrenceDate()` - Calculate next occurrence based on pattern
- `generateOccurrences()` - Generate array of future occurrence dates
- `formatRecurrencePattern()` - Format pattern for display
- `shouldGenerateNextInstance()` - Check if new instance should be created

### 3. UI Components Updated

#### CreateTask Page (`src/pages/CreateTask.tsx`)
- Added recurring task toggle
- Added recurrence pattern selector (daily/weekly/monthly/custom)
- Added interval input
- Added end date and occurrence count options
- Updated submission logic to create parent task + initial instances

#### TaskEdit Page (`src/pages/TaskEdit.tsx`) - NEW
- Full edit functionality for tasks
- Edit scope selector for recurring instances:
  - "Only this occurrence" - updates single instance
  - "This and all future" - updates parent + future instances
- Smart delete handling:
  - Regular tasks: simple delete
  - Recurring templates: option to delete all instances
  - Recurring instances: delete single occurrence

#### TaskList Page (`src/pages/TaskList.tsx`)
- Added 🔁 icon for recurring tasks
- Shows icon for both templates and instances

#### TaskDetail Page (`src/pages/TaskDetail.tsx`)
- Added 🔁 icon in title
- Added recurring info panel showing pattern and end conditions
- Edit button now routes to `/task/:id/edit`

### 4. Routing
**File:** `src/App.tsx`
- Added route: `/task/:id/edit` → TaskEditPage

## Recurrence Logic

### Task Creation Flow
1. User creates a recurring task with start date
2. System creates parent task template (is_recurring=true)
3. System generates next 5 instances as individual task records
4. Each instance has:
   - `parent_task_id` pointing to template
   - `recurrence_instance_date` set to scheduled date
   - Same title, description, priority as template

### Why Individual Records vs. Single Pattern?
**Chosen approach:** Create individual task records for each occurrence

**Pros:**
- Each instance can be edited independently
- Completed/cancelled status per occurrence
- Simpler querying (standard task list queries work)
- Easy to reschedule individual occurrences
- Better for task assignment in future (if team features added)

**Cons:**
- More database records
- Requires periodic generation of new instances

**Alternative approach considered:** Single template that calculates occurrences on-demand
- Would save records but complicate editing individual occurrences
- Harder to track completion per occurrence
- Would require complex UI state management

### Future Instance Generation
Current implementation generates 5 future instances on creation. 

**Recommended:** Add a background job/cron to:
1. Check recurring templates daily
2. If fewer than 5 future instances exist, generate more
3. Respect end_date and count limits

Example query to find templates needing instances:
```sql
SELECT * FROM tasks 
WHERE is_recurring = true 
AND (
  SELECT COUNT(*) FROM tasks t2 
  WHERE t2.parent_task_id = tasks.id 
  AND t2.due_date > NOW()
) < 5;
```

## Testing Checklist

### Basic Recurring Task Creation
- [ ] Create daily recurring task
- [ ] Create weekly recurring task (every 1 week)
- [ ] Create bi-weekly recurring task (every 2 weeks)
- [ ] Create monthly recurring task
- [ ] Verify 5 instances are created
- [ ] Check that instances have correct due dates

### End Conditions
- [ ] Create recurring task with end date
- [ ] Verify instances stop at end date
- [ ] Create recurring task with occurrence count (e.g., 10)
- [ ] Verify exactly 10 instances are created
- [ ] Create recurring task with no end condition
- [ ] Verify 5 instances created (would need cron for more)

### Editing Recurring Tasks
- [ ] Edit parent task → changes should apply to template
- [ ] Edit instance with "Only this occurrence"
- [ ] Verify only that instance changes
- [ ] Edit instance with "This and all future"
- [ ] Verify parent + future instances updated
- [ ] Past instances remain unchanged

### Deleting Recurring Tasks
- [ ] Delete parent task with "delete all instances" option
- [ ] Verify template + all instances deleted
- [ ] Delete parent task without "delete all instances"
- [ ] Verify only template deleted, instances remain
- [ ] Delete single instance
- [ ] Verify only that instance deleted

### Display & UX
- [ ] Recurring indicator (🔁) shows on task list
- [ ] Recurring indicator shows on task detail
- [ ] Recurring pattern displays correctly (e.g., "Weekly", "Every 2 weeks")
- [ ] End date displays when set
- [ ] Occurrence count displays when set
- [ ] Edit scope selector appears for instances

### Edge Cases
- [ ] Create recurring task without start date → should require start date
- [ ] Set end date before start date → should show error
- [ ] Set interval to 0 → should default to 1
- [ ] Complete parent task → should not affect instances
- [ ] Complete instance → only that occurrence marked complete
- [ ] Change non-recurring task to recurring → should work
- [ ] Change recurring task to non-recurring → should work

## Database Migration

To apply the migration:

```bash
# If using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase dashboard
# SQL Editor → Run migrations/07_add_recurring_tasks.sql
```

## Future Enhancements

### 1. Advanced Recurrence Patterns
- Specific days of week (e.g., "Every Monday and Wednesday")
- Month-relative (e.g., "2nd Tuesday of each month")
- Yearly recurrence

### 2. Background Job for Instance Generation
```typescript
// Suggested cron job (run daily)
async function generateRecurringInstances() {
  // Find templates with < 5 future instances
  const templates = await supabase
    .from('tasks')
    .select('*, future_count:tasks!parent_task_id(count)')
    .eq('is_recurring', true)
    .having('future_count', 'lt', 5)
  
  for (const template of templates) {
    // Generate additional instances up to 5 total
    const occurrences = generateOccurrences(...)
    // Insert new instances
  }
}
```

### 3. Recurring Task Calendar View
- Month/week view showing all recurring instances
- Drag-and-drop to reschedule
- Visual pattern preview

### 4. Smart Suggestions
- "This task keeps recurring - make it automatic?"
- Detect patterns in manual task creation

### 5. Exception Handling
- Mark specific occurrences as "skipped"
- Temporary pause on recurrence
- Resume from specific date

## Architecture Decisions

### Why Not Use Cron Format?
- Cron is complex and error-prone for users
- Simple patterns (daily/weekly/monthly) cover 90% of use cases
- Can add advanced patterns later without breaking changes

### Why Store Pattern in Each Instance?
- Simplifies queries (no need to join to parent)
- Allows pattern to evolve (e.g., change from weekly to monthly)
- Each instance is self-describing

### Why Generate Limited Instances?
- Prevents database bloat for infinite recurring tasks
- Easier to manage and debug
- User can always see "next few" without scrolling forever
- Background job can top up as needed

## Support & Troubleshooting

### Instance Generation Not Working
1. Check if migration applied: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'is_recurring'`
2. Check console logs for errors during task creation
3. Verify generateOccurrences() is calculating dates correctly

### Recurring Indicator Not Showing
1. Verify `is_recurring` or `parent_task_id` is set
2. Check TaskList.tsx has updated type definition
3. Clear browser cache

### Edit Scope Not Working
1. Verify `parent_task_id` exists on instance
2. Check SQL update queries in network tab
3. Ensure RLS policies allow updates

## Code Quality Notes

- TypeScript types are consistent across all files
- Follows existing StackDek UI patterns (rounded-lg borders, neutral color scheme)
- Error handling in place for all API calls
- User confirmations for destructive actions (delete)
- Loading states during async operations
- Accessible form labels and inputs

## Performance Considerations

- Indexes added on `parent_task_id` and `is_recurring` for fast lookups
- Query optimization: Fetch only necessary fields
- Limit instance generation to prevent excessive DB writes
- Consider pagination if user has many recurring tasks

---

**Implementation Date:** February 14, 2026
**Version:** 1.0
**Status:** ✅ Ready for Testing
