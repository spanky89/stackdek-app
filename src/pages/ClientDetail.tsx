import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Client = { id: string; name: string; email: string | null; phone: string | null; address: string | null; vip: boolean }
type Job = { id: string; title: string; status: string; estimate_amount: number; date_scheduled: string }
type Quote = { id: string; title: string; status: string; amount: number; expiration_date: string | null }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', vip: false })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: c, error: cErr } = await supabase
          .from('clients').select('*').eq('id', id).single()
        if (cErr) { setError(cErr.message); return }
        setClient(c)
        setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', vip: c.vip })

        const [jobRes, quoteRes] = await Promise.all([
          supabase.from('jobs').select('id, title, status, estimate_amount, date_scheduled').eq('client_id', id).order('date_scheduled', { ascending: false }),
          supabase.from('quotes').select('id, title, status, amount, expiration_date').eq('client_id', id).order('created_at', { ascending: false }),
        ])
        setJobs(jobRes.data || [])
        setQuotes(quoteRes.data || [])
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function saveEdit() {
    if (!form.name.trim()) return
    setSaving(true)
    const { error: upErr } = await supabase.from('clients').update({
      name: form.name.trim(), email: form.email.trim() || null,
      phone: form.phone.trim() || null, address: form.address.trim() || null, vip: form.vip,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    setClient({ ...client!, ...form, name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, address: form.address.trim() || null })
    setEditing(false)
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!client) return <div className="p-6">Client not found.</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Client Detail</h1>
          <button onClick={() => nav('/clients')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          {editing ? (
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" />
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" />
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.vip} onChange={e => setForm({ ...form, vip: e.target.checked })} />
                <label className="text-sm">VIP</label>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="bg-neutral-900 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{client.name}</h2>
                  {client.vip && <span className="bg-neutral-100 text-neutral-800 text-xs px-2 py-0.5 rounded-full font-medium">VIP</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">Quick Edit</button>
                  <button onClick={() => nav(`/client/${id}/edit`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Full Edit</button>
                </div>
              </div>
              <div className="mt-4 space-y-1 text-sm text-neutral-600">
                <p>Email: {client.email || '—'}</p>
                <p>Phone: {client.phone || '—'}</p>
                <p>Address: {client.address || '—'}</p>
              </div>
            </>
          )}
        </div>

        {/* Jobs */}
        <h3 className="text-lg font-semibold mb-3">Jobs ({jobs.length})</h3>
        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center text-neutral-600 mb-6">No jobs.</div>
        ) : (
          <div className="space-y-3 mb-6">
            {jobs.map(j => (
              <div key={j.id} onClick={() => nav(`/job/${j.id}`)} className="bg-white rounded-lg border border-neutral-200 p-4 cursor-pointer hover:bg-neutral-50">
                <div className="flex justify-between">
                  <span className="font-medium">{j.title}</span>
                  <span className="text-sm text-neutral-600">${j.estimate_amount}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600 mt-1">
                  <span>{new Date(j.date_scheduled).toLocaleDateString()}</span>
                  <span className="px-2 py-0.5 bg-neutral-100 rounded">{j.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quotes */}
        <h3 className="text-lg font-semibold mb-3">Quotes ({quotes.length})</h3>
        {quotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center text-neutral-600">No quotes.</div>
        ) : (
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id} onClick={() => nav(`/quote/${q.id}`)} className="bg-white rounded-lg border border-neutral-200 p-4 cursor-pointer hover:bg-neutral-50">
                <div className="flex justify-between">
                  <span className="font-medium">{q.title}</span>
                  <span className="text-sm text-neutral-600">${q.amount}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-600 mt-1">
                  <span>{q.expiration_date ? `Expires ${new Date(q.expiration_date).toLocaleDateString()}` : 'No expiration'}</span>
                  <span className="px-2 py-0.5 bg-neutral-100 rounded">{q.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    </AppLayout>
  )
}
