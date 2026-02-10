import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

type RecentJob = { id: string; title: string; date_scheduled: string; status: string }
type RecentQuote = { id: string; title: string; amount: number; status: string }
type RecentInvoice = { id: string; invoice_number: string; total_amount: number; status: string }

export default function HomePage() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stats
  const [totalJobs, setTotalJobs] = useState(0)
  const [totalInvoiced, setTotalInvoiced] = useState(0)
  const [pendingQuotes, setPendingQuotes] = useState(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)

  // Recent activity
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([])
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([])
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])

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

        // Run all queries in parallel
        const [jobsRes, invoicesRes, pendingRes, monthlyRes, rJobsRes, rQuotesRes, rInvoicesRes] =
          await Promise.all([
            // Total jobs count
            supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', cid),
            // Total invoiced
            supabase.from('invoices').select('total_amount').eq('company_id', cid),
            // Pending quotes count
            supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'pending'),
            // Monthly revenue
            supabase.from('invoices').select('total_amount').eq('company_id', cid).gte('created_at', monthStart),
            // Recent 3 jobs
            supabase.from('jobs').select('id, title, date_scheduled, status').eq('company_id', cid).order('created_at', { ascending: false }).limit(3),
            // Recent 3 quotes
            supabase.from('quotes').select('id, title, amount, status').eq('company_id', cid).order('created_at', { ascending: false }).limit(3),
            // Recent 3 invoices
            supabase.from('invoices').select('id, invoice_number, total_amount, status').eq('company_id', cid).order('created_at', { ascending: false }).limit(3),
          ])

        setTotalJobs(jobsRes.count ?? 0)
        setTotalInvoiced(invoicesRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) ?? 0)
        setPendingQuotes(pendingRes.count ?? 0)
        setMonthlyRevenue(monthlyRes.data?.reduce((s, r) => s + (r.total_amount || 0), 0) ?? 0)
        setRecentJobs((rJobsRes.data as any) ?? [])
        setRecentQuotes((rQuotesRes.data as any) ?? [])
        setRecentInvoices((rInvoicesRes.data as any) ?? [])
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  if (loading) return <div className="p-6 text-neutral-600">Loading…</div>
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>

  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const statusDot = (s: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-500', paid: 'bg-green-500',
      pending: 'bg-yellow-500', scheduled: 'bg-blue-500',
      'in-progress': 'bg-blue-500', sent: 'bg-blue-500',
      draft: 'bg-neutral-400', overdue: 'bg-red-500', cancelled: 'bg-red-400',
    }
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[s] ?? 'bg-neutral-400'} mr-1.5`} />
  }

  // Monthly revenue as % of total invoiced (for progress bar)
  const revPct = totalInvoiced > 0 ? Math.min(100, Math.round((monthlyRevenue / totalInvoiced) * 100)) : 0

  return (
    <AppLayout>
      <>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard label="Total Jobs" value={String(totalJobs)} accent="bg-neutral-900" />
          <StatCard label="Total Invoiced" value={fmt(totalInvoiced)} accent="bg-blue-600" />
          <StatCard label="Pending Quotes" value={String(pendingQuotes)} accent="bg-yellow-500" />
          <StatCard label="Monthly Revenue" value={fmt(monthlyRevenue)} accent="bg-green-600" />
        </div>

        {/* Monthly vs Total progress */}
        {totalInvoiced > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-neutral-600">This month vs total</span>
              <span className="font-medium">{revPct}%</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${revPct}%` }} />
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="space-y-3 mb-6">
          {recentJobs.length > 0 && (
            <ActivitySection title="Recent Jobs">
              {recentJobs.map(j => (
                <button key={j.id} onClick={() => nav(`/job/${j.id}`)} className="flex items-center justify-between w-full text-left py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{j.title}</p>
                    <p className="text-xs text-neutral-600">{new Date(j.date_scheduled).toLocaleDateString()}</p>
                  </div>
                  <span className="flex items-center text-xs capitalize">{statusDot(j.status)}{j.status}</span>
                </button>
              ))}
            </ActivitySection>
          )}

          {recentQuotes.length > 0 && (
            <ActivitySection title="Recent Quotes">
              {recentQuotes.map(q => (
                <button key={q.id} onClick={() => nav(`/quote/${q.id}`)} className="flex items-center justify-between w-full text-left py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{q.title}</p>
                    <p className="text-xs text-neutral-600">{fmt(q.amount)}</p>
                  </div>
                  <span className="flex items-center text-xs capitalize">{statusDot(q.status)}{q.status}</span>
                </button>
              ))}
            </ActivitySection>
          )}

          {recentInvoices.length > 0 && (
            <ActivitySection title="Recent Invoices">
              {recentInvoices.map(inv => (
                <button key={inv.id} onClick={() => nav(`/invoices`)} className="flex items-center justify-between w-full text-left py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium">#{inv.invoice_number}</p>
                    <p className="text-xs text-neutral-600">{fmt(inv.total_amount)}</p>
                  </div>
                  <span className="flex items-center text-xs capitalize">{statusDot(inv.status)}{inv.status}</span>
                </button>
              ))}
            </ActivitySection>
          )}
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => nav('/jobs')} className="bg-neutral-900 text-white p-4 rounded-lg font-semibold">Jobs</button>
          <button onClick={() => nav('/clients')} className="bg-neutral-900 text-white p-4 rounded-lg font-semibold">Clients</button>
          <button onClick={() => nav('/quotes')} className="bg-neutral-900 text-white p-4 rounded-lg font-semibold">Quotes</button>
          <button onClick={() => nav('/invoices')} className="bg-neutral-900 text-white p-4 rounded-lg font-semibold">Invoices</button>
        </div>
      </>
    </AppLayout>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <div className={`w-8 h-1 ${accent} rounded mb-2`} />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-neutral-600 mt-0.5">{label}</p>
    </div>
  )
}

function ActivitySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-4">
      <h3 className="text-sm font-semibold text-neutral-700 mb-2">{title}</h3>
      {children}
    </div>
  )
}
