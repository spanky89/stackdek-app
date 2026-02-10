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
  total: number; created_at: string
}
type Note = { id: string; content: string; created_at: string }
type TabKey = 'overview' | 'history' | 'notes'

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [jobs, setJobs] = useState<any[]>([])
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

        const [invRes, jobRes] = await Promise.all([
          supabase.from('invoices').select('id, title, invoice_number, status, total, created_at')
            .eq('client_id', id).order('created_at', { ascending: false }).limit(10),
          supabase.from('jobs').select('id, title, status, estimate_amount, date_scheduled, created_at')
            .eq('client_id', id).order('created_at', { ascending: false }).limit(20),
        ])
        setInvoices(invRes.data || [])
        setJobs(jobRes.data || [])

        // Notes - try fetching, gracefully handle if table doesn't exist
        try {
          const { data: nData } = await supabase.from('client_notes')
            .select('*').eq('client_id', id).order('created_at', { ascending: false })
          setNotes(nData || [])
        } catch { /* table may not exist yet */ }
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
    } catch { /* ignore */ }
    finally { setSavingNote(false) }
  }

  function clientSince() {
    if (!client?.created_at) return ''
    const d = new Date(client.created_at)
    return `Client since ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  }

  function statusBadge(status: string) {
    const s = status.toLowerCase()
    const bg = s === 'paid' ? 'bg-neutral-800' : s === 'pending' ? 'bg-neutral-400' : s === 'past_due' || s === 'overdue' ? 'bg-neutral-900' : 'bg-neutral-500'
    const label = s === 'past_due' ? 'Past Due' : s.charAt(0).toUpperCase() + s.slice(1)
    return <span className={`px-2 py-0.5 ${bg} text-white text-xs rounded-full`}>{label}</span>
  }

  if (loading) return <div className="min-h-screen bg-neutral-100 flex items-center justify-center"><p className="text-neutral-600">Loading…</p></div>
  if (!client) return <div className="min-h-screen bg-neutral-100 p-6"><p>Client not found.</p></div>

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => nav(-1)} className="text-neutral-700 text-lg">←</button>
            <span className="font-medium">Client Profile</span>
          </div>
          <div className="flex items-center space-x-2">
            {client.vip && (
              <span className="text-xs px-2 py-1 bg-neutral-100 rounded-full font-medium">VIP Client</span>
            )}
            <button
              onClick={() => nav(`/client/${id}/edit`)}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-md text-sm"
            >Edit</button>
          </div>
        </div>
        {/* Client Header with Avatar + Actions */}
        <div className="bg-white p-4 border-b border-neutral-200">
          <div className="flex items-center space-x-3 mb-4">
            <img
              src={`https://api.dicebear.com/7.x/notionists/svg?scale=200&seed=${client.id}`}
              className="w-16 h-16 rounded-full bg-neutral-100"
              alt={client.name}
            />
            <div>
              <h1 className="text-lg font-semibold">{client.name}</h1>
              <p className="text-sm text-neutral-500">{clientSince()}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <a
              href={client.phone ? `tel:${client.phone}` : '#'}
              className="py-2 bg-neutral-900 text-white rounded-md text-sm text-center"
            >
              <span className="block text-base">📞</span>
              <span className="block text-xs">Call</span>
            </a>
            <a
              href={client.phone ? `sms:${client.phone}` : client.email ? `mailto:${client.email}` : '#'}
              className="py-2 bg-neutral-800 text-white rounded-md text-sm text-center"
            >
              <span className="block text-base">💬</span>
              <span className="block text-xs">Message</span>
            </a>
            <a
              href={client.address ? `https://maps.google.com/?q=${encodeURIComponent(client.address)}` : '#'}
              target="_blank"
              rel="noreferrer"
              className="py-2 bg-neutral-700 text-white rounded-md text-sm text-center"
            >
              <span className="block text-base">📍</span>
              <span className="block text-xs">Navigate</span>
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-neutral-200">
          <div className="flex">
            {(['overview', 'history', 'notes'] as TabKey[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-4 py-3 text-sm capitalize ${tab === t ? 'border-b-2 border-neutral-900 font-medium' : 'text-neutral-500'}`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <>
            {/* Contact Details */}
            <div className="bg-white border-b border-neutral-200">
              <div className="p-4 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Email</span>
                  <span className="text-sm">{client.email || '—'}</span>
                </div>
              </div>
              <div className="p-4 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Phone</span>
                  <span className="text-sm">{client.phone || '—'}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-500">Address</span>
                  <span className="text-sm text-right max-w-[60%]">{client.address || '—'}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-4">
              <div className="px-4 py-3 bg-white border-y border-neutral-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-medium">Recent Activity</h2>
                  <button
                    onClick={() => nav('/invoices')}
                    className="text-sm text-neutral-500"
                  >View All</button>
                </div>
              </div>
              <div className="bg-white">
                {invoices.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500 text-sm">No invoices yet.</div>
                ) : invoices.slice(0, 5).map((inv, i) => (
                  <div key={inv.id} className={`p-4 ${i < Math.min(invoices.length, 5) - 1 ? 'border-b border-neutral-200' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{inv.title || 'Invoice'}</h3>
                        <p className="text-sm text-neutral-500">Invoice #{inv.invoice_number || inv.id.slice(0, 4)}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {statusBadge(inv.status)}
                          <span className="text-sm text-neutral-500">
                            {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium">${inv.total?.toLocaleString() ?? '0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="mt-4">
            <div className="px-4 py-3 bg-white border-y border-neutral-200">
              <h2 className="text-base font-medium">Job History</h2>
            </div>
            <div className="bg-white">
              {jobs.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 text-sm">No jobs yet.</div>
              ) : jobs.map((job, i) => (
                <div
                  key={job.id}
                  onClick={() => nav(`/job/${job.id}`)}
                  className={`p-4 cursor-pointer hover:bg-neutral-50 ${i < jobs.length - 1 ? 'border-b border-neutral-200' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{job.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {statusBadge(job.status)}
                        <span className="text-sm text-neutral-500">
                          {new Date(job.date_scheduled || job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">${job.estimate_amount?.toLocaleString() ?? '0'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="mt-4">
            {/* Add Note */}
            <div className="bg-white border-y border-neutral-200 p-4">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note about this client..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
              />
              <button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="mt-2 px-4 py-2 bg-neutral-900 text-white rounded-md text-sm disabled:opacity-50"
              >{savingNote ? 'Saving…' : 'Add Note'}</button>
            </div>
            <div className="bg-white mt-1">
              {notes.length === 0 ? (
                <div className="p-4 text-center text-neutral-500 text-sm">No notes yet.</div>
              ) : notes.map((note, i) => (
                <div key={note.id} className={`p-4 ${i < notes.length - 1 ? 'border-b border-neutral-200' : ''}`}>
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
