import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'

type Invoice = {
  id: string; invoice_number: string; status: string; total_amount: number
  created_at: string; clients: { name: string } | null
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
]

const SORT_OPTIONS = [
  { label: 'Newest', fn: (a: Invoice, b: Invoice) => b.created_at.localeCompare(a.created_at) },
  { label: 'Oldest', fn: (a: Invoice, b: Invoice) => a.created_at.localeCompare(b.created_at) },
  { label: 'Amount ↑', fn: (a: Invoice, b: Invoice) => a.total_amount - b.total_amount },
  { label: 'Amount ↓', fn: (a: Invoice, b: Invoice) => b.total_amount - a.total_amount },
  { label: 'Invoice #', fn: (a: Invoice, b: Invoice) => a.invoice_number.localeCompare(b.invoice_number) },
]

const statusColors: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-800',
  sent: 'bg-neutral-100 text-neutral-800',
  paid: 'bg-neutral-100 text-neutral-800',
}

export default function InvoiceListPage() {
  const nav = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const list = useListFilter(invoices, {
    searchKeys: ['invoice_number', (inv) => inv.clients?.name ?? ''],
    filterKey: 'status',
    sortOptions: SORT_OPTIONS,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        const { data } = await supabase.from('invoices').select('id, invoice_number, status, total_amount, created_at, clients(name)').eq('company_id', company.id).order('created_at', { ascending: false })
        setInvoices((data as any) || [])
      } finally { setLoading(false) }
    })()
  }, [])

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <div className="flex gap-2">
            <button onClick={() => nav('/invoices/create')} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">New Invoice</button>
            <button onClick={() => nav('/home')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Home</button>
          </div>
        </div>

        <ListToolbar
          search={list.search} onSearch={list.setSearch}
          placeholder="Search invoices…"
          filters={FILTERS} activeFilter={list.filter} onFilter={list.setFilter}
          count={list.count} total={list.total}
          sortOptions={SORT_OPTIONS.map(s => ({ label: s.label }))}
          sortIdx={list.sortIdx} onSort={list.setSortIdx}
        />

        {list.filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            {invoices.length === 0 ? 'No invoices yet.' : 'No matching invoices.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Amount</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {list.filtered.map(inv => (
                  <tr key={inv.id} onClick={() => nav(`/invoice/${inv.id}`)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{inv.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">${inv.total_amount}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[inv.status] || 'bg-neutral-100'}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{new Date(inv.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    </AppLayout>
  )
}
