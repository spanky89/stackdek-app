import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'
import { RecurrencePattern, generateOccurrences, formatRecurrencePattern } from '../utils/recurringTasks'

export default function CreateTaskPage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState('')
  
  // Recurring task fields
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly')
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceCount, setRecurrenceCount] = useState<number | ''>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!companyId) {
      setError('Company ID not found')
      return
    }

    if (isRecurring && !dueDate) {
      setError('Start date is required for recurring tasks')
      return
    }

    if (isRecurring && recurrenceEndDate && recurrenceEndDate <= dueDate) {
      setError('End date must be after start date')
      return
    }

    setLoading(true)

    try {
      // Create the main recurring task template
      const taskData: any = {
        company_id: companyId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
        status: 'pending',
        is_recurring: isRecurring,
      }

      if (isRecurring) {
        taskData.recurrence_pattern = recurrencePattern
        taskData.recurrence_interval = recurrenceInterval
        taskData.recurrence_end_date = recurrenceEndDate || null
        taskData.recurrence_count = recurrenceCount || null
      }

      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (insertError) throw insertError

      // If recurring, generate initial future instances (next 5 occurrences)
      if (isRecurring && dueDate) {
        const occurrences = generateOccurrences(
          dueDate,
          {
            pattern: recurrencePattern,
            interval: recurrenceInterval,
            endDate: recurrenceEndDate || undefined,
            count: typeof recurrenceCount === 'number' ? recurrenceCount : undefined,
          },
          5 // Generate next 5 instances
        )

        // Create task instances for each occurrence
        const instances = occurrences.map((date) => ({
          company_id: companyId,
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: date,
          status: 'pending',
          parent_task_id: data.id,
          recurrence_instance_date: date,
        }))

        if (instances.length > 0) {
          const { error: instanceError } = await supabase
            .from('tasks')
            .insert(instances)

          if (instanceError) {
            console.error('Error creating recurring instances:', instanceError)
            // Don't fail the entire operation, just log the error
          }
        }
      }

      // Navigate back to tasks list or dashboard
      nav('/tasks', { replace: true })
    } catch (err: any) {
      console.error('Error creating task:', err)
      setError(err.message || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="text-neutral-600 hover:text-neutral-900 transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">New Task</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="e.g., Call supplier about materials"
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
              placeholder="Add details about the task..."
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

          {/* Recurring Task Toggle */}
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

            {/* Recurring Options */}
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => nav(-1)}
              className="flex-1 px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
