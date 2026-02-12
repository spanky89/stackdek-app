import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Client = {
  id: string; name: string; email: string | null; phone: string | null
  address: string | null; vip: boolean; created_at: string
}
type Invoice = {
  id: string; title: string; invoice_number: string; status: string
  total_amount: number; created_at: string
}
type Job = {
  id: string; title: string; status: string
  estimate_amount: number; date_scheduled: string; created_at: string
}
type Quote = {
  id: string; title: string; status: string
  amount: number; created_at: string
}
type Note = { id: string; content: string; created_at: string }
type TabKey = 'overview' | 'history' | 'notes'

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [tab, setTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
        if (c) setClient(c)

        const [invRes, jobRes, quoteRes] = await Promise.all([
          supabase.from('invoices').select('id, title, invoice_number, status, total_amount, created_at')
            .eq('client_id', id).order('created_at', { ascending: false }).limit(10),
          supabase.from('jobs').select('id, title, status, estimate_amount, date_scheduled, created_at')
            .eq('client_id', id).order('created_at', { ascending: false }).limit(20),
          supabase.from('quotes').select('id, title, status, amount, created_at')
            .eq('client_id', id).eq('status', 'accepted').order('created_at', { ascending: false }).limit(10),
        ])
        setInvoices(invRes.data || [])
        setJobs(jobRes.data || [])
        setQuotes(quoteRes.data || [])

        try {
          const { data: nData } = await supabase.from('client_notes')
            .select('*').eq('client_id', id).order('created_at', { ascending: false })
          setNotes(nData || [])
        } catch { }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    })()
  }, [id])

  async function addNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('client_notes').insert({
        client_id: id, content: newNote.trim(), user_id: user?.id,
      }).select().single()
      if (!error && data) {
        setNotes([data, ...notes])
        setNewNote('')
      }
    } catch { }
    finally { setSavingNote(false) }
  }

  function clientSince() {
    if (!client?.created_at) return ''
    const d = new Date(client.created_at)
    return `Client since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  }

  function statusBadge(status: string) {
    const s = status.toLowerCase()
    let bg = 'bg-neutral-400 text-neutral-800'
    let label = s.charAt(0).toUpperCase() + s.slice(1)
    
    if (s === 'paid') {
      bg = 'bg-neutral-800 text-white'
    } else if (s === 'pending') {
      bg = 'bg-neutral-300 text-neutral-800'
    } else if (s === 'past_due' || s === 'past-due' || s === 'overdue') {
      bg = 'bg-red-600 text-white'
      label = 'Past Due'
    } else if (s === 'scheduled') {
      bg = 'bg-blue-500 text-white'
    } else if (s === 'completed' || s === 'done') {
      bg = 'bg-green-600 text-white'
    }
    
    return <span className={`px-2 py-0.5 ${bg} text-xs rounded-full font-medium`}>{label}</span>
  }

  if (loading) return <div className="min-h-screen bg-neutral-100 flex items-center justify-center"><p className="text-neutral-600">Loading…</p></div>
  if (!client) return <div className="min-h-screen bg-neutral-100 p-6"><p>Client not found.</p></div>

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => nav(-1)} className="text-neutral-700 text-2xl leading-none">←</button>
            <span className="font-semibold text-lg">Client Profile</span>
          </div>
          <div className="flex items-center gap-2">
            {client.vip && (
              <span className="text-xs px-3 py-1.5 bg-neutral-800 text-white rounded-lg font-medium">VIP Client</span>
            )}
            <button
              onClick={() => nav(`/client/${id}/edit`)}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium"
            >Edit</button>
          </div>
        </div>

        {/* Client Info Section */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          {/* Name & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">{client.name}</h1>
            <p className="text-sm text-neutral-600">{clientSince()}</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <a
              href={client.phone ? `tel:${client.phone}` : '#'}
              className="py-3 bg-neutral-900 text-white rounded-lg text-sm text-center font-medium hover:bg-neutral-800 transition"
            >
              Call
            </a>
            <a
              href={client.phone ? `sms:${client.phone}` : client.email ? `mailto:${client.email}` : '#'}
              className="py-3 bg-neutral-900 text-white rounded-lg text-sm text-center font-medium hover:bg-neutral-800 transition"
            >
              Message
            </a>
            <a
              href={client.address ? `https://maps.google.com/?q=${encodeURIComponent(client.address)}` : '#'}
              target="_blank"
              rel="noreferrer"
              className="py-3 bg-neutral-900 text-white rounded-lg text-sm text-center font-medium hover:bg-neutral-800 transition"
            >
              Navigate
            </a>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-neutral-200">
            {(['overview', 'history', 'notes'] as TabKey[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-medium transition ${
                  tab === t
                    ? 'text-neutral-900 border-b-2 border-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === 'overview' && (
            <div className="mt-6">
              {/* Contact Info */}
              <div className="space-y-4 pb-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Email</span>
                  <span className="text-sm font-medium">{client.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Phone</span>
                  <span className="text-sm font-medium">{client.phone || '—'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-neutral-600">Address</span>
                  <span className="text-sm font-medium text-right max-w-[60%]">{client.address || '—'}</span>
                </div>
              </div>

              {/* Accepted Quotes */}
              {quotes.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-semibold">Accepted Quotes</h2>
                  </div>
                  <div className="space-y-3">
                    {quotes.map(q => (
                      <button
                        key={q.id}
                        onClick={() => nav(`/quote/${q.id}`)}
                        className="w-full text-left flex justify-between items-start p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition"
                      >
                        <div>
                          <p className="text-sm font-medium">{q.title}</p>
                          <span className="text-xs text-neutral-600 mt-2 block">
                            {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-sm font-semibold">${q.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-base font-semibold">Recent Activity</h2>
                  <button
                    onClick={() => nav('/invoices')}
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >View All</button>
                </div>
                {invoices.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">No invoices yet.</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.slice(0, 5).map(inv => (
                      <div key={inv.id} className="flex justify-between items-start p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition">
                        <div>
                          <p className="text-sm font-medium">{inv.title || 'Invoice'}</p>
                          <p className="text-xs text-neutral-600">Invoice #{inv.invoice_number || inv.id.slice(0, 4)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {statusBadge(inv.status)}
                            <span className="text-xs text-neutral-600">
                              {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">${inv.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="mt-6">
              <h2 className="text-base font-semibold mb-4">Job History</h2>
              {jobs.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-4">No jobs yet.</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <button
                      key={job.id}
                      onClick={() => nav(`/job/${job.id}`)}
                      className="w-full text-left p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{job.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {statusBadge(job.status)}
                            <span className="text-xs text-neutral-600">
                              {new Date(job.date_scheduled || job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">${job.estimate_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="mt-6">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note about this client..."
                rows={3}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20 mb-3"
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="w-full px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >{savingNote ? 'Saving…' : 'Add Note'}</button>

              <div className="mt-6">
                {notes.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4">No notes yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map(note => (
                      <div key={note.id} className="p-3 bg-neutral-50 rounded-lg">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-neutral-500 mt-2">
                          {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
