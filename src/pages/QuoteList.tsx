import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import CreateQuoteForm from '../components/CreateQuoteForm'
import AppLayout from '../components/AppLayout'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; created_at?: string
  scheduled_date?: string | null; scheduled_time?: string | null
  clients: { name: string; id: string; avatar_url?: string } | null
}

export default function QuoteListPage() {
  const nav = useNavigate()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        // Fetch all quotes (exclude accepted/approved as they move to jobs)
        const { data } = await supabase
          .from('quotes')
          .select('id, title, status, amount, expiration_date, created_at, scheduled_date, scheduled_time, clients(id, name, avatar_url)')
          .eq('company_id', company.id)
          .neq('status', 'accepted')
          .neq('status', 'approved')
          .order('created_at', { ascending: false })
        setQuotes((data as any) || [])
      } finally { setLoading(false) }
    })()
  }, [refreshKey])

  // Split quotes into scheduled (has scheduled_date) and pending (status = pending)
  const scheduledQuotes = quotes.filter(q => q.scheduled_date).sort((a, b) => {
    const dateA = a.scheduled_date || ''
    const dateB = b.scheduled_date || ''
    return dateA.localeCompare(dateB)
  })
  
  const pendingQuotes = quotes.filter(q => q.status === 'pending' && !q.scheduled_date)

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatDaysAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recently'
    const createdDate = new Date(dateStr)
    const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    return `${daysAgo} days ago`
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Pending Quotes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Pending Quotes</h2>
          </div>
          
          {pendingQuotes.length === 0 ? (
            <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center text-sm text-neutral-600">
              No pending quotes
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuotes.map(q => (
                <button
                  key={q.id}
                  onClick={() => nav(`/quote/${q.id}`)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-neutral-900 mb-1">{q.title}</h3>
                      <p className="text-sm text-neutral-600">{q.clients?.name || 'Unknown Client'}</p>
                    </div>
                    <span className="text-sm font-semibold text-neutral-900 ml-3">${q.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Sent {formatDaysAgo(q.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Quotes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Scheduled Quotes</h2>
          </div>
          
          {scheduledQuotes.length === 0 ? (
            <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center text-sm text-neutral-600">
              No scheduled quotes
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledQuotes.map(q => {
                const clientInitial = q.clients?.name?.[0]?.toUpperCase() || '?'
                
                return (
                  <button
                    key={q.id}
                    onClick={() => nav(`/quote/${q.id}`)}
                    className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-neutral-700">
                        {clientInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="font-semibold text-neutral-900">{q.clients?.name || 'Unknown Client'}</p>
                            <p className="text-sm text-neutral-600">{q.title}</p>
                          </div>
                          <span className="text-sm text-neutral-600 ml-3">{q.scheduled_date ? formatDate(q.scheduled_date) : ''}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1 text-xs text-neutral-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(q.scheduled_time)}</span>
                          </div>
                          <span className="text-sm font-semibold text-neutral-900">${q.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

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
      </div>
    </AppLayout>
  )
}
