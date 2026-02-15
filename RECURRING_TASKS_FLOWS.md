# Recurring Tasks - User Flows & Examples

## Flow 1: Creating a Recurring Task

```
User Journey: Weekly Team Meeting

1. Click "Tasks" → "+ New Task"
2. Enter title: "Weekly Team Standup"
3. Add description: "Sync on progress and blockers"
4. Set priority: Medium
5. Set start date: 2026-02-17 (Monday)
6. Toggle "🔁 Make this a recurring task"
7. Select pattern: "Weekly"
8. Interval: 1 (every week)
9. End condition: Leave empty (ongoing)
10. Click "Create Task"

Result:
- 1 parent task (template) created
- 5 child tasks created:
  - Feb 17, 2026
  - Feb 24, 2026
  - Mar 3, 2026
  - Mar 10, 2026
  - Mar 17, 2026
- All show 🔁 icon in task list
```

## Flow 2: Editing a Single Occurrence

```
User Journey: Reschedule One Meeting

1. Click on task "Weekly Team Standup - Feb 24"
2. Click "Edit"
3. See prompt: "What would you like to edit?"
4. Select: "Only this occurrence" (default)
5. Change date to Feb 25 (moved to Tuesday)
6. Click "Save Changes"

Result:
- Feb 24 task now due Feb 25
- All other instances unchanged
- Template unchanged
- Feb 25 task still linked to parent
```

## Flow 3: Editing All Future Occurrences

```
User Journey: Move Meeting Time Permanently

1. Click on task "Weekly Team Standup - Mar 3"
2. Click "Edit"
3. Select: "This and all future occurrences"
4. Change title: "Weekly Team Sync (New Time)"
5. Change description: "Now at 2 PM instead of 10 AM"
6. Click "Save Changes"

Result:
- Parent template updated
- Mar 3 task updated
- Mar 10 task updated
- Mar 17 task updated
- Feb 17 & Feb 24 (past) unchanged
```

## Flow 4: Deleting a Recurring Task

```
User Journey: Cancel Recurring Meeting Series

1. Click on parent task (first occurrence)
2. Click "Edit" → "Delete"
3. See prompt: "Delete all future occurrences too?"
4. Click "OK" (delete all)

Result:
- Parent template deleted
- All child instances deleted
- Task list now clean

Alternative: Click "Cancel" → Only template deleted
```

## Flow 5: Completing Recurring Tasks

```
User Journey: Mark Meeting as Done

1. Click on task "Weekly Team Standup - Feb 17"
2. Change status: "Pending" → "Completed"
3. Task marked complete

Result:
- Only Feb 17 instance marked complete
- Shows green "Completed" badge
- completed_at timestamp set
- Future instances still "Pending"
- User can review past completions
```

## Database Structure Example

### Parent Task (Template)
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Weekly Team Standup",
  "description": "Sync on progress and blockers",
  "priority": "medium",
  "due_date": "2026-02-17",
  "status": "pending",
  "is_recurring": true,
  "recurrence_pattern": "weekly",
  "recurrence_interval": 1,
  "recurrence_end_date": null,
  "recurrence_count": null,
  "parent_task_id": null,
  "recurrence_instance_date": null
}
```

### Child Task (Instance)
```json
{
  "id": "223e4567-e89b-12d3-a456-426614174001",
  "title": "Weekly Team Standup",
  "description": "Sync on progress and blockers",
  "priority": "medium",
  "due_date": "2026-02-24",
  "status": "pending",
  "is_recurring": false,
  "parent_task_id": "123e4567-e89b-12d3-a456-426614174000",
  "recurrence_instance_date": "2026-02-24"
}
```

## UI Components Breakdown

### CreateTask Form - Recurring Section
```
┌─────────────────────────────────────────┐
│ ☑ 🔁 Make this a recurring task         │
├─────────────────────────────────────────┤
│ │ Repeat Pattern:  [Weekly     ▼]      │
│ │                                        │
│ │ Every: [1] week(s)                    │
│ │                                        │
│ │ 📅 Weekly                             │
│ │                                        │
│ │ End Condition (optional):             │
│ │   End Date: [          ]              │
│ │   Or after: [    ] occurrences        │
└─────────────────────────────────────────┘
```

### TaskList Card - Recurring Indicator
```
┌─────────────────────────────────────────┐
│ 🔁 Weekly Team Standup          [medium]│
│ Sync on progress and blockers           │
│ 📅 Due: Feb 17  Created: Feb 10         │
│                              [Pending]  │
└─────────────────────────────────────────┘
```

### TaskDetail - Recurring Info Panel
```
┌─────────────────────────────────────────┐
│ 🔁 Weekly Team Standup    [Medium Priority]
├─────────────────────────────────────────┤
│ Sync on progress and blockers           │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 🔁 Recurring: Weekly                │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ Status: [Pending][In Progress][...]     │
└─────────────────────────────────────────┘
```

### TaskEdit - Scope Selector
```
┌─────────────────────────────────────────┐
│ This is a recurring task instance.      │
│ What would you like to edit?            │
│                                          │
│ ⦿ Only this occurrence                  │
│ ○ This and all future occurrences       │
└─────────────────────────────────────────┘
```

## Real-World Use Cases

### 1. Contractor: Monthly Client Invoice
```
Task: "Send invoice to Acme Corp"
Pattern: Monthly
Interval: 1
Start: 2026-03-01
End: After 12 occurrences (1 year contract)
```

### 2. Property Manager: Bi-weekly Property Inspection
```
Task: "Inspect Building A - Units 1-5"
Pattern: Weekly
Interval: 2
Start: 2026-02-18
End: 2026-12-31
```

### 3. Freelancer: Daily Time Tracking
```
Task: "Submit daily timesheet"
Pattern: Daily
Interval: 1
Start: 2026-02-17 (Monday)
End: 2026-02-21 (Friday) - 5 occurrences
```

### 4. Team Lead: Quarterly Performance Review
```
Task: "Conduct team performance reviews"
Pattern: Monthly
Interval: 3 (every 3 months)
Start: 2026-03-01
End: After 4 occurrences (full year)
```

### 5. Maintenance: Custom Interval Task
```
Task: "Change HVAC filters"
Pattern: Custom
Interval: 90 (every 90 days)
Start: 2026-02-15
End: Ongoing
```

## Edge Cases Handled

### Case 1: Leap Year
```
Task due Feb 29, 2024 (leap year)
Next year: Moves to Feb 28, 2025
Logic: JavaScript Date handles this automatically
```

### Case 2: Month Overflow
```
Task due Jan 31
Monthly recurrence
Next: Feb 31 → Becomes Mar 3
Logic: JavaScript Date auto-adjusts
```

### Case 3: End Date Reached
```
Task: Weekly, end date Mar 1
Start: Feb 1
Instances: Feb 1, 8, 15, 22, 29
Mar 1 NOT created (end date reached)
```

### Case 4: Count Limit
```
Task: Daily, 5 occurrences
Instances: Day 1, 2, 3, 4, 5
Day 6 NOT created (count reached)
```

### Case 5: Delete Parent Before Instances Complete
```
User deletes parent task
Instances remain orphaned (parent_task_id points to deleted)
Future: Could add cascade delete or "orphan adoption"
```

## State Diagram

```
┌─────────────┐
│   Create    │
│  Recurring  │
│    Task     │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Generate 5 Instances │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Task List (with 🔁 indicator)   │
└──────┬──────────────────┬────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│   View      │    │  Complete    │
│   Detail    │    │  Instance    │
└──────┬──────┘    └──────────────┘
       │
       ▼
┌──────────────────┐
│  Edit Task       │
│  • This only     │
│  • All future    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Save Changes    │
└──────────────────┘
```

## Performance Metrics

### Expected Database Impact
- Parent task: 1 row (~500 bytes)
- 5 instances: 5 rows (~2.5 KB)
- Total per recurring task: ~3 KB
- 1000 recurring tasks: ~3 MB
- Indexes add ~10% overhead

### Query Performance
```sql
-- Fast lookup (indexed)
SELECT * FROM tasks WHERE parent_task_id = ?
-- Uses idx_tasks_parent_task_id

-- Fast recurring filter (indexed)
SELECT * FROM tasks WHERE is_recurring = true
-- Uses idx_tasks_is_recurring

-- Standard list query (no change)
SELECT * FROM tasks WHERE company_id = ?
-- Uses existing company_id index
```

---

**Summary:**
- ✅ Simple, intuitive user flows
- ✅ Handles common edge cases
- ✅ Efficient database design
- ✅ Scalable architecture
- ✅ Consistent with StackDek patterns

**Status:** Ready for production use
