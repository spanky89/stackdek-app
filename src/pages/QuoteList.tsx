import React, { useEffect, useState } from 'react'
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
  const [showSchedule, setShowSchedule] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [newRequestsCount, setNewRequestsCount] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No user found')
          return
        }
        console.log('User ID:', user.id)
        
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) {
          console.log('No company found for user')
          return
        }
        console.log('Company ID:', company.id)
        
        // Fetch quotes, clients, and requests in parallel
        const [quotesRes, clientsRes, requestsRes] = await Promise.all([
          supabase
            .from('quotes')
            .select('*')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('clients')
            .select('id, name, avatar_url')
            .eq('company_id', company.id),
          supabase
            .from('requests')
            .select('id')
            .eq('company_id', company.id)
            .eq('status', 'pending')
        ])
        
        console.log('Quotes query result:', quotesRes)
        if (quotesRes.error) console.error('Quotes query error:', quotesRes.error)
        
        // Build client lookup map
        const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))
        
        // Filter out accepted/approved quotes and attach client data
        const allQuotes = (quotesRes.data as any) || []
        const filteredQuotes = allQuotes
          .filter((q: any) => q.status !== 'accepted' && q.status !== 'approved')
          .map((q: any) => ({
            ...q,
            clients: clientsMap.get(q.client_id) || null
          }))
        
        setQuotes(filteredQuotes)
        setNewRequestsCount(requestsRes.data?.length || 0)
      } finally { setLoading(false) }
    })()
  }, [refreshKey])

  // Split quotes into draft, scheduled, and pending
  const draftQuotes = quotes.filter(q => q.status === 'draft').sort((a, b) => {
    const dateA = a.created_at || ''
    const dateB = b.created_at || ''
    return dateB.localeCompare(dateA) // Most recent first
  })
  
  const scheduledQuotes = quotes.filter(q => q.scheduled_date).sort((a, b) => {
    const dateA = a.scheduled_date || ''
    const dateB = b.scheduled_date || ''
    return dateA.localeCompare(dateB)
  })
  
  const pendingQuotes = quotes.filter(q => q.status === 'pending' && !q.scheduled_date)
  
  // Debug logging
  console.log('All quotes:', quotes)
  console.log('Draft quotes:', draftQuotes)
  console.log('Scheduled quotes:', scheduledQuotes)
  console.log('Pending quotes:', pendingQuotes)

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
        {/* New Requests */}
        {newRequestsCount > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-neutral-900">New Requests</h2>
              <button onClick={() => nav('/requests')} className="text-xs text-blue-600 hover:underline">
                View all
              </button>
            </div>
            <button
              onClick={() => nav('/requests')}
              className="w-full flex items-center justify-between py-3 px-4 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">●</span>
                <span className="text-sm font-medium text-neutral-900">{newRequestsCount} new request{newRequestsCount !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-neutral-400">→</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-neutral-900">New Quote</span>
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className="bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-neutral-900">Schedule Quote</span>
          </button>
        </div>

        {/* Draft Quotes Section */}
        {draftQuotes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900">Draft Quotes</h2>
              <span className="text-xs text-neutral-500">{draftQuotes.length} draft{draftQuotes.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="space-y-3">
              {draftQuotes.map(q => (
                <button
                  key={q.id}
                  onClick={() => nav(`/quote/${q.id}`)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-4 hover:bg-neutral-50 transition text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-neutral-900">{q.title}</h3>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">Draft</span>
                      </div>
                      <p className="text-sm text-neutral-600">{q.clients?.name || 'Unknown Client'}</p>
                    </div>
                    {q.amount > 0 && (
                      <span className="text-sm font-semibold text-neutral-900 ml-3">${q.amount.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-600">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Created {formatDaysAgo(q.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
                    <span className="text-sm font-semibold text-neutral-900 ml-3">${q.amount?.toLocaleString() ?? '0'}</span>
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
                          <span className="text-sm font-semibold text-neutral-900">${q.amount?.toLocaleString() ?? '0'}</span>
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

        {showSchedule && (
          <ScheduleQuoteModal 
            onClose={() => setShowSchedule(false)} 
            onSuccess={() => { 
              setShowSchedule(false)
              setLoading(true)
              setRefreshKey(k => k + 1)
            }} 
          />
        )}
      </div>
    </AppLayout>
  )
}

// Schedule Quote Modal Component
function ScheduleQuoteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
      if (!company) return
      const { data } = await supabase.from('clients').select('id, name').eq('company_id', company.id).order('name')
      setClients((data as any) || [])
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!formData.client_id || !formData.title || !formData.scheduled_date || !formData.scheduled_time) {
      alert('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
      if (!company) throw new Error('No company found')

      const { error } = await supabase.from('quotes').insert({
        company_id: company.id,
        client_id: formData.client_id,
        title: formData.title,
        amount: 0,
        status: 'draft',
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time,
        expiration_date: null
      })

      if (error) throw error
      onSuccess()
    } catch (err) {
      console.error('Error scheduling quote:', err)
      alert(`Failed to schedule quote appointment: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Schedule Quote Appointment</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Client</label>
            <select
              value={formData.client_id}
              onChange={e => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            >
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Service Type</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Kitchen Remodel, Deck Installation"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Time</label>
              <input
                type="time"
                value={formData.scheduled_time}
                onChange={e => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any special instructions or details..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {submitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
