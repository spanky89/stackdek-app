import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import CreateQuoteForm from '../components/CreateQuoteForm'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; created_at?: string; clients: { name: string } | null
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Expired', value: 'expired' },
]

const SORT_OPTIONS = [
  { label: 'Newest', fn: (a: Quote, b: Quote) => (b.created_at ?? '').localeCompare(a.created_at ?? '') },
  { label: 'Oldest', fn: (a: Quote, b: Quote) => (a.created_at ?? '').localeCompare(b.created_at ?? '') },
  { label: 'Title A-Z', fn: (a: Quote, b: Quote) => a.title.localeCompare(b.title) },
  { label: 'Amount ↑', fn: (a: Quote, b: Quote) => a.amount - b.amount },
  { label: 'Amount ↓', fn: (a: Quote, b: Quote) => b.amount - a.amount },
]

export default function QuoteListPage() {
  const nav = useNavigate()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const list = useListFilter(quotes, {
    searchKeys: ['title', (q) => q.clients?.name ?? ''],
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
        const { data } = await supabase.from('quotes').select('id, title, status, amount, expiration_date, created_at, clients(name)').eq('company_id', company.id).order('created_at', { ascending: false })
        setQuotes((data as any) || [])
      } finally { setLoading(false) }
    })()
  }, [refreshKey])

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quotes</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-medium">+ New Quote</button>
            <button onClick={() => nav('/home')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Home</button>
          </div>
        </div>

        <ListToolbar
          search={list.search} onSearch={list.setSearch}
          placeholder="Search quotes…"
          filters={FILTERS} activeFilter={list.filter} onFilter={list.setFilter}
          count={list.count} total={list.total}
          sortOptions={SORT_OPTIONS.map(s => ({ label: s.label }))}
          sortIdx={list.sortIdx} onSort={list.setSortIdx}
        />

        {list.filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            {quotes.length === 0 ? 'No quotes yet.' : 'No matching quotes.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Client</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Expires</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.filtered.map(q => (
                  <tr key={q.id} onClick={() => nav(`/quote/${q.id}`)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{q.title}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{q.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-right">${q.amount}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{q.expiration_date ? new Date(q.expiration_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium">{q.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">New Quote</h2>
                <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
              </div>
              <CreateQuoteForm onSuccess={() => { setShowCreate(false); setLoading(true); setRefreshKey(k => k + 1) }} />
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}
