import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'

type Task = {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  due_date?: string
  completed_at?: string
  created_at: string
  is_recurring?: boolean
  parent_task_id?: string
  recurrence_pattern?: string
  recurrence_interval?: number
}

export default function TaskListPage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setTasks(data || [])
      } catch (err) {
        console.error('Error fetching tasks:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'pending') return task.status !== 'completed'
    if (filter === 'completed') return task.status === 'completed'
    return true
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-green-600 bg-green-50'
      default:
        return 'text-neutral-600 bg-neutral-50'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Completed</span>
      case 'in_progress':
        return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">In Progress</span>
      case 'cancelled':
        return <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700">Cancelled</span>
      default:
        return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Pending</span>
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading tasks…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Tasks</h1>
          <button
            onClick={() => nav('/tasks/create')}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition"
          >
            + New Task
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-neutral-200">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'text-neutral-900 border-b-2 border-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
            <p className="text-neutral-600">No tasks found</p>
            <button
              onClick={() => nav('/tasks/create')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => nav(`/task/${task.id}`)}
                className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {(task.is_recurring || task.parent_task_id) && (
                        <span className="text-base" title="Recurring task">🔁</span>
                      )}
                      <h3 className="text-base font-semibold text-neutral-900 truncate">
                        {task.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-neutral-600 line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      {task.due_date && (
                        <span>
                          📅 Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span>
                        Created: {new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(task.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
