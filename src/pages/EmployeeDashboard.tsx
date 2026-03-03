import AppLayout from '../components/AppLayout'
import ClockInOut from '../components/ClockInOut'
import MyJobsWidget from '../components/MyJobsWidget'

export default function EmployeeDashboard() {
  // Mock employee data
  const employeeName = 'Mike Davis'
  const employeeRole = 'employee'

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-neutral-900">
              Welcome, {employeeName}
            </h1>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
              Employee
            </span>
          </div>
          <p className="text-neutral-600">
            Your personalized dashboard. Clock in, view your assignments, and track your tasks.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Employee View</p>
              <p className="text-sm text-blue-800">
                You can only see jobs and tasks assigned to you. Prices and billing information are hidden. 
                For full access, contact your manager.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Clock In/Out */}
          <ClockInOut />

          {/* Quick Stats */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">This Week</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Hours Worked</span>
                <span className="text-2xl font-bold text-neutral-900">32.5h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Jobs Completed</span>
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-600">Tasks Completed</span>
                <span className="text-2xl font-bold text-blue-600">18</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Jobs */}
        <div className="mb-6">
          <MyJobsWidget />
        </div>

        {/* My Tasks */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">My Tasks</h2>
            <span className="text-sm text-neutral-600">5 pending</span>
          </div>

          <div className="space-y-2">
            {[
              { id: 1, task: 'Measure deck dimensions', job: 'Install Deck', completed: false, priority: 'high' },
              { id: 2, task: 'Order materials', job: 'Install Deck', completed: false, priority: 'high' },
              { id: 3, task: 'Prep ground surface', job: 'Install Deck', completed: true, priority: 'medium' },
              { id: 4, task: 'Install posts', job: 'Install Deck', completed: false, priority: 'medium' },
              { id: 5, task: 'Apply sealant', job: 'Fence Installation', completed: false, priority: 'low' },
            ].map(task => (
              <div
                key={task.id}
                className={`border rounded-lg p-3 ${task.completed ? 'bg-neutral-50 border-neutral-200' : 'border-neutral-200 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="w-5 h-5 rounded border-neutral-300"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${task.completed ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                      {task.task}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">Job: {task.job}</p>
                  </div>
                  {!task.completed && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'high' ? 'bg-red-100 text-red-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Restrictions Info */}
        <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-neutral-900 mb-2">What you can access:</h3>
          <ul className="text-sm text-neutral-700 space-y-1">
            <li>✓ Jobs and tasks assigned to you</li>
            <li>✓ Clock in/out and time tracking</li>
            <li>✓ View job details and line items</li>
            <li>✗ Prices and billing information</li>
            <li>✗ All company clients and quotes</li>
            <li>✗ Company settings and team management</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  )
}
