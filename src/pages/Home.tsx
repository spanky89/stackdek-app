import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { DocumentIcon, BriefcaseIcon } from '../components/Icons'
import { useCompany } from '../context/CompanyContext'

type Job = { id: string; title: string; date_scheduled: string; status: string; estimate_amount: number; clients: { name: string } | null }
type Quote = { id: string; title: string; amount: number; status: string; clients: { name: string } | null }
type Reminder = { id: string; title: string; due_date: string }

export default function HomePage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([])
  const [newRequests, setNewRequests] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [revenueGoal, setRevenueGoal] = useState(100000)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState('100000')
  const [savingGoal, setSavingGoal] = useState(false)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }

    ;(async () => {
      try {
        const cid = companyId
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        // Fetch company details first (for revenue goal)
        const { data: companyData } = await supabase
          .from('companies')
          .select('revenue_goal')
          .eq('id', cid)
          .single()
        
        if (companyData?.revenue_goal) {
          setRevenueGoal(companyData.revenue_goal)
          setGoalInput(String(companyData.revenue_goal))
        }

        // Fetch all data in parallel
        const [jobsRes, quotesRes, newReqRes, completedJobsRes, remindersRes] = await Promise.all([
          // Upcoming jobs (next 30 days)
          supabase
            .from('jobs')
            .select('id, title, date_scheduled, status, estimate_amount, clients(name)')
            .eq('company_id', cid)
            .gte('date_scheduled', now.toISOString().split('T')[0])
            .lte('date_scheduled', next30days.split('T')[0])
            .order('date_scheduled', { ascending: true })
            .limit(5),
          // Pending quotes
          supabase
            .from('quotes')
            .select('id, title, amount, status, clients(name)')
            .eq('company_id', cid)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5),
          // New requests count (pending quotes)
          supabase
            .from('quotes')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', cid)
            .eq('status', 'pending'),
          // Paid invoices this month (for revenue)
          supabase
            .from('invoices')
            .select('total_amount')
            .eq('company_id', cid)
            .eq('status', 'paid')
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd),
          // Task reminders
          supabase
            .from('reminders')
            .select('id, title, due_date')
            .eq('company_id', cid)
            .gte('due_date', now.toISOString().split('T')[0])
            .order('due_date', { ascending: true })
            .limit(5),
        ])

        setUpcomingJobs((jobsRes.data as any) || [])
        setPendingQuotes((quotesRes.data as any) || [])
        setNewRequests(newReqRes.count ?? 0)
        setMonthlyRevenue(completedJobsRes.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0)
        setReminders((remindersRes.data as any) || [])
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [companyId])

  if (loading) return <div className="p-6 text-neutral-600">Loading…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  async function saveRevenueGoal() {
    const parsed = parseInt(goalInput, 10)
    if (isNaN(parsed) || parsed < 0) return

    setSavingGoal(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: err } = await supabase
        .from('companies')
        .update({ revenue_goal: parsed })
        .eq('owner_id', user.id)

      if (err) throw err
      setRevenueGoal(parsed)
      setShowGoalModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSavingGoal(false)
    }
  }

  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const revenuePct = Math.min(100, Math.round((monthlyRevenue / revenueGoal) * 100))

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-neutral-800 text-white',
      pending: 'bg-neutral-300 text-neutral-800',
      'past-due': 'bg-red-500 text-white',
      scheduled: 'bg-blue-500 text-white',
      completed: 'bg-green-600 text-white',
      'in-progress': 'bg-blue-500 text-white',
    }
    return colors[status] || 'bg-neutral-200 text-neutral-800'
  }

  return (
    <AppLayout>
      <>
        {/* Revenue Goal */}
        <button
          onClick={() => { setShowGoalModal(true); setGoalInput(String(revenueGoal)) }}
          className="w-full bg-white rounded-lg border border-neutral-200 p-4 mb-4 hover:bg-neutral-50 transition text-left"
        >
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Revenue Goal</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-neutral-600">Monthly Goal: {fmt(revenueGoal)}</span>
            <span className="text-sm font-semibold">{fmt(monthlyRevenue)}</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-neutral-900 h-full rounded-full transition-all duration-300"
              style={{ width: `${revenuePct}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">Click to edit goal</p>
        </button>

        {/* New Requests */}
        {newRequests > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">📧</span>
                <div>
                  <h3 className="text-sm font-semibold">New Requests</h3>
                  <p className="text-xs text-neutral-600">{newRequests} pending quote{newRequests !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => nav('/quotes')}
                className="text-neutral-900 hover:text-neutral-700 font-medium text-sm"
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => nav('/quotes')}
            className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition flex flex-col items-center"
          >
            <div className="text-neutral-900 mb-2"><DocumentIcon /></div>
            <p className="text-xs font-semibold">New Quote</p>
          </button>
          <button
            onClick={() => nav('/jobs')}
            className="bg-white border border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 transition flex flex-col items-center"
          >
            <div className="text-neutral-900 mb-2"><BriefcaseIcon /></div>
            <p className="text-xs font-semibold">Schedule Job</p>
          </button>
        </div>

        {/* Upcoming Jobs */}
        {upcomingJobs.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Upcoming Jobs</h3>
              <button
                onClick={() => nav('/jobs')}
                className="text-neutral-500 hover:text-neutral-700 text-xs font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {upcomingJobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => nav(`/job/${job.id}`)}
                  className="w-full text-left p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition border border-neutral-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{job.clients?.name || 'Unknown'}</p>
                      <p className="text-xs text-neutral-600">{job.title}</p>
                    </div>
                    <span className="text-sm font-semibold">{fmt(job.estimate_amount || 0)}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">{new Date(job.date_scheduled).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pending Quotes */}
        {pendingQuotes.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Pending Quotes</h3>
              <button
                onClick={() => nav('/quotes')}
                className="text-neutral-500 hover:text-neutral-700 text-xs font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {pendingQuotes.map(quote => (
                <button
                  key={quote.id}
                  onClick={() => nav(`/quote/${quote.id}`)}
                  className="w-full text-left p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition border border-neutral-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{quote.clients?.name || 'Unknown'}</p>
                      <p className="text-xs text-neutral-600">{quote.title}</p>
                    </div>
                    <span className="text-sm font-semibold">{fmt(quote.amount)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task Reminders */}
        {reminders.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Task Reminders</h3>
              <button
                onClick={() => nav('/reminders')}
                className="text-neutral-500 hover:text-neutral-700 text-xs font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-2">
              {reminders.map(reminder => (
                <button
                  key={reminder.id}
                  onClick={() => nav(`/reminder/${reminder.id}`)}
                  className="w-full text-left p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition border border-neutral-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📋</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{reminder.title}</p>
                      <p className="text-xs text-neutral-500">{new Date(reminder.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {upcomingJobs.length === 0 && pendingQuotes.length === 0 && reminders.length === 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
            <p className="text-neutral-600 text-sm">No jobs, quotes, or reminders yet. Create one to get started.</p>
          </div>
        )}

        {/* Revenue Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGoalModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">Set Monthly Revenue Goal</h2>
              <input
                type="number"
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                placeholder="100000"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRevenueGoal}
                  disabled={savingGoal}
                  className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {savingGoal ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

      </>
    </AppLayout>
  )
}
