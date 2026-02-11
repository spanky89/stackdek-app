import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { DocumentIcon, BriefcaseIcon } from '../components/Icons'

type Job = { id: string; title: string; date_scheduled: string; status: string; estimate_amount: number; clients: { name: string } | null }
type Quote = { id: string; title: string; amount: number; status: string; clients: { name: string } | null }
type Reminder = { id: string; title: string; due_date: string }

export default function HomePage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([])
  const [pendingQuotes, setPendingQuotes] = useState<Quote[]>([])
  const [newRequests, setNewRequests] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)
  const [reminders, setReminders] = useState<Reminder[]>([])

  const REVENUE_GOAL = 100000 // $100k monthly goal

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (!company) {
          await supabase
            .from('companies')
            .insert({ owner_id: user.id, name: 'My Company' })
            .select()
            .single()
          setLoading(false)
          return
        }

        const cid = company.id
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        // Fetch all data in parallel
        const [jobsRes, quotesRes, newReqRes, monthlyRes] = await Promise.all([
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
          // Monthly revenue
          supabase
            .from('invoices')
            .select('total_amount')
            .eq('company_id', cid)
            .gte('created_at', monthStart),
        ])

        setUpcomingJobs((jobsRes.data as any) || [])
        setPendingQuotes((quotesRes.data as any) || [])
        setNewRequests(newReqRes.count ?? 0)
        setMonthlyRevenue(monthlyRes.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-6 text-neutral-600">Loading…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const revenuePct = Math.min(100, Math.round((monthlyRevenue / REVENUE_GOAL) * 100))

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
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Revenue Goal</h2>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-neutral-600">Monthly Goal: {fmt(REVENUE_GOAL)}</span>
            <span className="text-sm font-semibold">{fmt(monthlyRevenue)}</span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-neutral-900 h-full rounded-full transition-all duration-300"
              style={{ width: `${revenuePct}%` }}
            />
          </div>
        </div>

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

        {/* Empty State */}
        {upcomingJobs.length === 0 && pendingQuotes.length === 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
            <p className="text-neutral-600 text-sm">No jobs or quotes yet. Create one to get started.</p>
          </div>
        )}
      </>
    </AppLayout>
  )
}
