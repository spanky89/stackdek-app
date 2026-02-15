import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'
import { filterToNextOccurrence } from '../utils/recurringTasks'

type Job = { id: string; title: string; date_scheduled: string; time_scheduled?: string; status: string; estimate_amount: number; clients: { name: string; avatar_url?: string } | null }
type Quote = { id: string; title: string; amount: number; status: string; created_at?: string; expires_at?: string; clients: { name: string; avatar_url?: string } | null }
type Request = { id: string; client_name: string; status: string; created_at: string }
type Task = { id: string; title: string; status: string; priority: string; due_date?: string; created_at: string; parent_task_id?: string }

export default function HomePage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(true)

  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([])
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [revenueGoal, setRevenueGoal] = useState(100000)
  const [recentTasks, setRecentTasks] = useState<Task[]>([])

  useEffect(() => {
    if (!companyId) { setLoading(false); return }

    ;(async () => {
      try {
        const cid = companyId
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Fetch company details (revenue goal)
        const { data: companyData } = await supabase
          .from('companies')
          .select('revenue_goal')
          .eq('id', cid)
          .single()
        
        if (companyData?.revenue_goal) {
          setRevenueGoal(companyData.revenue_goal)
        }

        // Fetch all data in parallel
        const [jobsRes, quotesRes, requestsRes, invoicesRes, tasksRes] = await Promise.all([
          // Upcoming jobs (next 30 days)
          supabase
            .from('jobs')
            .select('id, title, date_scheduled, time_scheduled, status, estimate_amount, clients(name, avatar_url)')
            .eq('company_id', cid)
            .gte('date_scheduled', now.toISOString().split('T')[0])
            .lte('date_scheduled', next30days)
            .order('date_scheduled', { ascending: true })
            .limit(5),
          // Pending quotes
          supabase
            .from('quotes')
            .select('id, title, amount, status, created_at, expires_at, clients(name, avatar_url)')
            .eq('company_id', cid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),
          // New requests (status = pending)
          supabase
            .from('requests')
            .select('id, client_name, status, created_at')
            .eq('company_id', cid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          // Paid invoices this month (for revenue)
          supabase
            .from('invoices')
            .select('total_amount')
            .eq('company_id', cid)
            .eq('status', 'paid')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd),
          // Recent tasks (pending/in_progress) - fetch more initially for filtering
          supabase
            .from('tasks')
            .select('id, title, status, priority, due_date, created_at, parent_task_id')
            .eq('company_id', cid)
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        setUpcomingJobs((jobsRes.data as any) || [])
        setPendingQuotes((quotesRes.data as any) || [])
        setNewRequestsCount(requestsRes.data?.length || 0)
        
        // Filter to show only next occurrence per recurring series, then limit to 5
        const allTasks = (tasksRes.data as any) || []
        const filteredTasks = filterToNextOccurrence(allTasks).slice(0, 5)
        setRecentTasks(filteredTasks)

        const revenue = (invoicesRes.data || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
        setMonthlyRevenue(revenue)
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const revenuePercentage = Math.round((monthlyRevenue / revenueGoal) * 100)

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Title */}
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>

        {/* Revenue Goal */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-neutral-900">Revenue Goal</h2>
            <span className="text-xs text-neutral-600">
              ${(monthlyRevenue / 1000).toFixed(0)}k / ${(revenueGoal / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-neutral-900 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* New Requests */}
        {newRequestsCount > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-neutral-900">New Requests</h2>
              <button onClick={() => nav('/requests')} className="text-xs text-blue-600 hover:underline">
                View all
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-neutral-100">
              <span className="text-xl">●</span>
              <span className="text-sm text-neutral-700">{newRequestsCount} new requests</span>
              <span className="text-neutral-400 ml-auto">→</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => nav('/quotes/create')} className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-900 transition">
                📋 New Quote
              </button>
              <button className="py-3 px-4 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm font-medium text-neutral-900 transition">
                📅 Schedule Job
              </button>
            </div>
          </div>
        )}

        {/* Upcoming Jobs */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Upcoming Jobs</h2>
            <button onClick={() => nav('/jobs')} className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
          {upcomingJobs.length === 0 ? (
            <p className="text-xs text-neutral-600">No upcoming jobs</p>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.map(job => (
                <div key={job.id} className="pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-neutral-700">
                      {job.clients?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{job.clients?.name || 'Client'}</p>
                      <p className="text-xs text-neutral-600">{job.title}</p>
                    </div>
                    <p className="text-sm font-semibold text-neutral-900 flex-shrink-0">${job.estimate_amount.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-600 ml-11">
                    <span>🕐 {formatDate(job.date_scheduled)} {formatTime(job.time_scheduled)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Quotes */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Pending Quotes</h2>
            <button onClick={() => nav('/quotes')} className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
          {pendingQuotes.length === 0 ? (
            <p className="text-xs text-neutral-600">No pending quotes</p>
          ) : (
            <div className="space-y-3">
              {pendingQuotes.map(quote => (
                <div key={quote.id} className="pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-neutral-700">
                      {quote.clients?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{quote.clients?.name || 'Client'}</p>
                      <p className="text-xs text-neutral-600">{quote.title}</p>
                    </div>
                    <p className="text-sm font-semibold text-neutral-900 flex-shrink-0">${quote.amount.toLocaleString()}</p>
                  </div>
                  {quote.expires_at && (
                    <div className="text-xs text-neutral-600 ml-11">
                      Expires: {formatDate(quote.expires_at)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">Recent Tasks</h2>
            <button onClick={() => nav('/tasks')} className="text-xs text-blue-600 hover:underline">
              View all
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-xs text-neutral-600">No active tasks</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => nav(`/task/${task.id}`)}
                  className="pb-3 border-b border-neutral-100 last:border-b-0 last:pb-0 cursor-pointer hover:bg-neutral-50 -mx-2 px-2 py-2 rounded transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{task.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-700' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-600">
                        <span className={`capitalize ${
                          task.status === 'in_progress' ? 'text-blue-600' : 'text-neutral-600'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {formatDate(task.due_date)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
