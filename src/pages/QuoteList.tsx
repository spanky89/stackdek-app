import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import CreateQuoteForm from '../components/CreateQuoteForm'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; created_at?: string; clients: { name: string; id: string } | null
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
        // Exclude accepted quotes from main list
        const { data } = await supabase.from('quotes').select('id, title, status, amount, expiration_date, created_at, clients(id, name)').eq('company_id', company.id).neq('status', 'accepted').order('created_at', { ascending: false })
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
          <div className="space-y-3">
            {list.filtered.map(q => {
              const createdDate = q.created_at ? new Date(q.created_at) : null
              const daysAgo = createdDate ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
              const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`
              const clientInitial = q.clients?.name?.[0]?.toUpperCase() || '?'
              
              return (
                <button
                  key={q.id}
                  onClick={() => nav(`/quote/${q.id}`)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition text-left"
                >
                  {/* Top row: Title + Amount */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-neutral-900 flex-1">{q.title}</h3>
                    <span className="text-sm font-semibold text-neutral-900 ml-3">${q.amount.toFixed(2)}</span>
                  </div>
                  
                  {/* Middle row: Client avatar + name + info */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-neutral-700">
                      {clientInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{q.clients?.name || 'Unknown'}</p>
                      <div className="flex items-center gap-1 text-xs text-neutral-600 mt-1">
                        <span>🕐</span>
                        <span>Sent {timeLabel}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
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
