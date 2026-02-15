import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'
import { RecurrencePattern, formatRecurrencePattern } from '../utils/recurringTasks'

type Task = {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  is_recurring: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_interval?: number
  recurrence_end_date?: string
  recurrence_count?: number
  parent_task_id?: string
}

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [editScope, setEditScope] = useState<'this' | 'future'>('this')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState<number | ''>('')

  useEffect(() => {
    if (!id || !companyId) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .eq('company_id', companyId)
          .single()

        if (fetchError) throw fetchError

        setTask(data)
        setTitle(data.title)
        setDescription(data.description || '')
        setPriority(data.priority)
        setDueDate(data.due_date || '')
        setIsRecurring(data.is_recurring || false)
        setRecurrencePattern(data.recurrence_pattern || 'weekly')
        setRecurrenceInterval(data.recurrence_interval || 1)
        setRecurrenceEndDate(data.recurrence_end_date || '')
        setRecurrenceCount(data.recurrence_count || '')
      } catch (err: any) {
        console.error('Error fetching task:', err)
        setError(err.message || 'Failed to load task')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (isRecurring && !dueDate) {
      setError('Start date is required for recurring tasks')
      return
    }

    setSaving(true)

    try {
      const updates: any = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        is_recurring: isRecurring,
      }

      if (isRecurring) {
        updates.recurrence_pattern = recurrencePattern
        updates.recurrence_interval = recurrenceInterval
        updates.recurrence_end_date = recurrenceEndDate || null
        updates.recurrence_count = recurrenceCount || null
      }

      // If this is a recurring instance, ask whether to update this or all future
      if (task?.parent_task_id && editScope === 'future') {
        // Update the parent template
        const { error: parentError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', task.parent_task_id)

        if (parentError) throw parentError

        // Update all future instances
        const { error: futureError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('parent_task_id', task.parent_task_id)
          .gte('due_date', task.due_date || new Date().toISOString())

        if (futureError) throw futureError
      } else {
        // Update just this task
        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', id)

        if (updateError) throw updateError
      }

      nav(`/task/${id}`)
    } catch (err: any) {
      console.error('Error updating task:', err)
      setError(err.message || 'Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    // If this is a recurring instance, ask for scope
    if (task.parent_task_id) {
      const choice = confirm(
        'This is a recurring task. Do you want to:\n' +
        'OK = Delete only this occurrence\n' +
        'Cancel = Go back'
      )
      
      if (!choice) return

      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id)

        if (deleteError) throw deleteError
        nav('/tasks', { replace: true })
      } catch (err: any) {
        console.error('Error deleting task:', err)
        setError(err.message || 'Failed to delete task')
      }
    } else if (task.is_recurring) {
      // Deleting a recurring template
      const deleteAll = confirm(
        'This is a recurring task template. Delete all future occurrences too?'
      )

      if (!deleteAll && !confirm('Delete just the template?')) return

      try {
        if (deleteAll) {
          // Delete all instances first
          await supabase
            .from('tasks')
            .delete()
            .eq('parent_task_id', task.id)
        }

        // Delete the template
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id)

        if (deleteError) throw deleteError
        nav('/tasks', { replace: true })
      } catch (err: any) {
        console.error('Error deleting task:', err)
        setError(err.message || 'Failed to delete task')
      }
    } else {
      // Regular task deletion
      if (!confirm('Delete this task?')) return

      try {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id)

        if (deleteError) throw deleteError
        nav('/tasks', { replace: true })
      } catch (err: any) {
        console.error('Error deleting task:', err)
        setError(err.message || 'Failed to delete task')
      }
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading…</div>
      </AppLayout>
    )
  }

  if (error && loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-red-600">{error}</div>
      </AppLayout>
    )
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-red-600">Task not found</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => nav(`/task/${id}`)}
              className="text-neutral-600 hover:text-neutral-900 transition"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-neutral-900">Edit Task</h1>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition text-sm"
          >
            Delete
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Edit Scope Selector for recurring instances */}
        {task.parent_task_id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">
              This is a recurring task instance. What would you like to edit?
            </p>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="editScope"
                  value="this"
                  checked={editScope === 'this'}
                  onChange={(e) => setEditScope(e.target.value as 'this' | 'future')}
                  className="text-blue-600"
                />
                <span className="text-sm text-blue-900">Only this occurrence</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="editScope"
                  value="future"
                  checked={editScope === 'future'}
                  onChange={(e) => setEditScope(e.target.value as 'this' | 'future')}
                  className="text-blue-600"
                />
                <span className="text-sm text-blue-900">This and all future occurrences</span>
              </label>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                {isRecurring ? 'Start Date *' : 'Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required={isRecurring}
              />
            </div>
          </div>

          {/* Recurring Task Toggle (only show if not an instance) */}
          {!task.parent_task_id && (
            <div className="border-t border-neutral-200 pt-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-900"
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-neutral-900 cursor-pointer">
                  🔁 Make this a recurring task
                </label>
              </div>

              {isRecurring && (
                <div className="space-y-4 pl-7 border-l-2 border-neutral-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 mb-2">
                        Repeat Pattern
                      </label>
                      <select
                        value={recurrencePattern}
                        onChange={(e) => setRecurrencePattern(e.target.value as RecurrencePattern)}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 mb-2">
                        Every
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={recurrenceInterval}
                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-20 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                        <span className="text-sm text-neutral-600">
                          {recurrencePattern === 'daily' && 'day(s)'}
                          {recurrencePattern === 'weekly' && 'week(s)'}
                          {recurrencePattern === 'monthly' && 'month(s)'}
                          {recurrencePattern === 'custom' && 'day(s)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-50 p-3 rounded-lg">
                    <p className="text-sm text-neutral-700">
                      📅 {formatRecurrencePattern(recurrencePattern, recurrenceInterval)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2">
                      End Condition (optional)
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">Or after # occurrences</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Leave empty for infinite"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(e.target.value ? parseInt(e.target.value) : '')}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => nav(`/task/${id}`)}
              className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
