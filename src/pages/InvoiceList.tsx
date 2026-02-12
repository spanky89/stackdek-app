import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  created_at: string
  clients: { name: string } | null
}

export default function InvoiceListPage() {
  const nav = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [monthlyRevenue, setMonthlyRevenue] = useState(0)

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
        if (!company) return

        // Fetch invoices
        const { data } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, total_amount, created_at, clients(name)')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
        setInvoices((data as any) || [])

        // Calculate monthly revenue
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const { data: monthlyData } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', company.id)
          .eq('status', 'paid')
          .gte('created_at', monthStart)
        const monthly = monthlyData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0
        setMonthlyRevenue(monthly)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const fmt = (n: number) =>
    '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const revenuePct = Math.min(100, Math.round((monthlyRevenue / REVENUE_GOAL) * 100))

  const filtered =
    filter === 'all'
      ? invoices
      : invoices.filter(inv => {
          const s = inv.status.toLowerCase()
          if (filter === 'awaiting_payment') return ['awaiting_payment', 'pending', 'draft', 'sent'].includes(s)
          if (filter === 'paid') return s === 'paid'
          return true
        })

  const statusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'paid') return 'bg-green-600 text-white'
    if (s === 'awaiting_payment' || s === 'sent') return 'bg-yellow-500 text-white'
    if (s === 'pending' || s === 'draft') return 'bg-neutral-300 text-neutral-800'
    if (s === 'overdue' || s === 'past_due') return 'bg-red-600 text-white'
    return 'bg-neutral-200 text-neutral-800'
  }

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'draft') return 'Draft'
    if (s === 'awaiting_payment') return 'Awaiting Payment'
    if (s === 'overdue' || s === 'past_due') return 'Past Due'
    return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
  }

  if (loading)
    return (
      <div className="p-6">
        <p className="text-neutral-600">Loading…</p>
      </div>
    )

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <button
            onClick={() => nav('/invoices/create')}
            className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-medium"
          >
            + New Invoice
          </button>
        </div>

        {/* Revenue Overview */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Revenue Overview</h2>
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

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          {[
            { value: 'all', label: 'All' },
            { value: 'awaiting_payment', label: 'Awaiting Payment' },
            { value: 'paid', label: 'Paid' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === value
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            {invoices.length === 0
              ? 'No invoices yet. Create one to get started.'
              : 'No matching invoices.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => (
              <button
                key={inv.id}
                onClick={() => nav(`/invoice/${inv.id}`)}
                className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <img
                      src="/logo-symbol.png"
                      className="w-10 h-10 rounded-lg bg-neutral-100 p-1.5"
                      alt="StackDek"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="text-sm font-semibold">
                          Invoice #{inv.invoice_number}
                        </p>
                        <p className="text-xs text-neutral-600">
                          {inv.clients?.name || 'Unknown Client'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold flex-shrink-0">
                        {fmt(inv.total_amount)}
                      </span>
                    </div>

                    {/* Status & Date */}
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${statusColor(
                          inv.status
                        )}`}
                      >
                        {statusLabel(inv.status)}
                      </span>
                      <span className="text-neutral-500">
                        {new Date(inv.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </>
    </AppLayout>
  )
}
