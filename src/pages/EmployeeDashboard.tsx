import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type AssignedJob = {
  id: string
  title: string
  status: string
  date_scheduled: string | null
  location: string | null
  clients: { name: string } | null
}

type TimeEntry = {
  id: string
  clock_in: string
  clock_out: string | null
  hours_worked: number | null
  job_id: string | null
}

export default function EmployeeDashboard() {
  const nav = useNavigate()
  const [employee, setEmployee] = useState<{ id: string; full_name: string; role: string } | null>(null)
  const [assignedJobs, setAssignedJobs] = useState<AssignedJob[]>([])
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null)
  const [weekHours, setWeekHours] = useState(0)
  const [elapsed, setElapsed] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!openEntry) { setElapsed(''); return }
    const tick = () => {
      const diff = Date.now() - new Date(openEntry.clock_in).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [openEntry])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { nav('/login'); return }

      // Get team member
      const { data: tm } = await supabase
        .from('team_members')
        .select('id, full_name, role')
        .eq('user_id', user.id)
        .single()

      if (!tm) {
        // Not an employee — redirect to normal home
        nav('/home')
        return
      }
      setEmployee(tm)

      // Get assigned jobs
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('team_member_id', tm.id)

      if (assignments && assignments.length > 0) {
        const jobIds = assignments.map(a => a.job_id)
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, status, date_scheduled, location, clients(name)')
          .in('id', jobIds)
          .not('status', 'eq', 'completed')
          .order('date_scheduled')
        setAssignedJobs((jobs as any) || [])
      }

      // Get open time entry (clocked in somewhere)
      const { data: openTime } = await supabase
        .from('time_entries')
        .select('*')
        .eq('team_member_id', tm.id)
        .is('clock_out', null)
        .single()
      setOpenEntry(openTime || null)

      // Get this week's hours
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const { data: weekEntries } = await supabase
        .from('time_entries')
        .select('hours_worked')
        .eq('team_member_id', tm.id)
        .gte('clock_in', weekStart.toISOString())
        .not('hours_worked', 'is', null)
      const total = weekEntries?.reduce((sum, e) => sum + (e.hours_worked || 0), 0) || 0
      setWeekHours(Math.round(total * 10) / 10)

    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Hey, {employee?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-neutral-500 text-sm mt-1 capitalize">{employee?.role} · StackDek</p>
        </div>

        {/* Clock status */}
        {openEntry && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">🟢 Currently Clocked In</p>
              <p className="text-sm font-mono text-green-700 mt-0.5">{elapsed}</p>
            </div>
            {openEntry.job_id && (
              <button
                onClick={() => nav(`/employee-job/${openEntry.job_id}`)}
                className="text-sm text-green-700 font-medium border border-green-300 px-3 py-1.5 rounded-lg"
              >
                View Job →
              </button>
            )}
          </div>
        )}

        {/* Week Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-neutral-900">{weekHours}h</p>
            <p className="text-xs text-neutral-500 mt-1">This Week</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-neutral-900">{assignedJobs.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Active Jobs</p>
          </div>
        </div>

        {/* Assigned Jobs */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">My Jobs</h2>
          {assignedJobs.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-neutral-400 text-sm">
              No jobs assigned yet.
            </div>
          ) : (
            <div className="space-y-2">
              {assignedJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => nav(`/employee-job/${job.id}`)}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-4 text-left hover:border-neutral-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-900 truncate">{job.title}</p>
                      {job.clients && <p className="text-sm text-neutral-500 mt-0.5">{job.clients.name}</p>}
                      {job.location && <p className="text-xs text-neutral-400 mt-0.5 truncate">{job.location}</p>}
                      {job.date_scheduled && (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {new Date(job.date_scheduled).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        job.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-neutral-100 text-neutral-600'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <span className="text-neutral-400">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
