import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'
import { formatRecurrencePattern, RecurrencePattern } from '../utils/recurringTasks'

type Task = {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
  is_recurring?: boolean
  parent_task_id?: string
  recurrence_pattern?: RecurrencePattern
  recurrence_interval?: number
  recurrence_end_date?: string
  recurrence_count?: number
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState<Task | null>(null)
  const [error, setError] = useState('')

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
      } catch (err: any) {
        console.error('Error fetching task:', err)
        setError(err.message || 'Failed to load task')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, companyId])

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return

    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'completed' && !task.completed_at) {
        updates.completed_at = new Date().toISOString()
      } else if (newStatus !== 'completed') {
        updates.completed_at = null
      }

      const { data, error: updateError } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)
        .select()
        .single()

      if (updateError) throw updateError
      setTask(data)
    } catch (err: any) {
      console.error('Error updating status:', err)
      alert('Failed to update status: ' + err.message)
    }
  }

  const handleDelete = async () => {
    if (!task) return
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)

      if (deleteError) throw deleteError
      nav('/tasks', { replace: true })
    } catch (err: any) {
      console.error('Error deleting task:', err)
      alert('Failed to delete task: ' + err.message)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading task…</div>
      </AppLayout>
    )
  }

  if (error || !task) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <button onClick={() => nav('/tasks')} className="text-neutral-600 hover:text-neutral-900">
            ← Back to Tasks
          </button>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Task not found'}
          </div>
        </div>
      </AppLayout>
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'low':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <button onClick={() => nav('/tasks')} className="text-neutral-600 hover:text-neutral-900 transition">
            ← Tasks
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => nav(`/task/${task.id}/edit`)}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg transition"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                {(task.is_recurring || task.parent_task_id) && (
                  <span className="text-2xl" title="Recurring task">🔁</span>
                )}
                <h1 className="text-2xl font-bold text-neutral-900">{task.title}</h1>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </span>
            </div>

            {task.description && (
              <p className="text-neutral-700 whitespace-pre-wrap">{task.description}</p>
            )}

            {/* Recurring Task Info */}
            {(task.is_recurring || task.parent_task_id) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <span className="font-semibold">🔁 Recurring:</span>
                  {task.is_recurring && task.recurrence_pattern && task.recurrence_interval && (
                    <span>
                      {formatRecurrencePattern(task.recurrence_pattern, task.recurrence_interval)}
                      {task.recurrence_end_date && (
                        <> until {new Date(task.recurrence_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                      )}
                      {task.recurrence_count && (
                        <> ({task.recurrence_count} occurrences)</>
                      )}
                    </span>
                  )}
                  {task.parent_task_id && !task.is_recurring && (
                    <span>This is an instance of a recurring task</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3">Status</h3>
            <div className="flex gap-2 flex-wrap">
              {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                    task.status === status
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Due Date</h3>
              <p className="text-sm text-neutral-600">
                {task.due_date
                  ? new Date(task.due_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'No due date'}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-900 mb-1">Created</h3>
              <p className="text-sm text-neutral-600">
                {new Date(task.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {task.completed_at && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">Completed</h3>
                <p className="text-sm text-neutral-600">
                  {new Date(task.completed_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
