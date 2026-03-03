interface JobSummary {
  id: string
  title: string
  client: string
  date: string
  status: 'scheduled' | 'in_progress' | 'completed'
  tasks: number
  completedTasks: number
}

const mockJobs: JobSummary[] = [
  {
    id: '1',
    title: 'Install Deck',
    client: 'Bob Johnson',
    date: '2026-03-05',
    status: 'scheduled',
    tasks: 5,
    completedTasks: 0
  },
  {
    id: '2',
    title: 'Patio Repair',
    client: 'Sarah Lee',
    date: '2026-03-07',
    status: 'scheduled',
    tasks: 3,
    completedTasks: 0
  },
  {
    id: '3',
    title: 'Fence Installation',
    client: 'Mike Davis',
    date: '2026-03-04',
    status: 'in_progress',
    tasks: 8,
    completedTasks: 5
  }
]

export default function MyJobsWidget() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">My Jobs</h2>
        <span className="text-sm text-neutral-600">{mockJobs.length} assigned</span>
      </div>

      <div className="space-y-3">
        {mockJobs.map(job => (
          <div
            key={job.id}
            className="border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-neutral-900 mb-1">{job.title}</h3>
                <p className="text-sm text-neutral-600">Client: {job.client}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                {getStatusLabel(job.status)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-neutral-600">
                  <span>📅</span>
                  <span>{formatDate(job.date)}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-600">
                  <span>✓</span>
                  <span>{job.completedTasks}/{job.tasks} tasks</span>
                </div>
              </div>
            </div>

            {/* Task Progress Bar */}
            {job.tasks > 0 && (
              <div className="mt-3">
                <div className="bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-green-600 h-full transition-all"
                    style={{ width: `${(job.completedTasks / job.tasks) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {mockJobs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-600 text-sm">No jobs assigned yet</p>
          </div>
        )}
      </div>

      {mockJobs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Jobs →
          </button>
        </div>
      )}
    </div>
  )
}
