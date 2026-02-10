import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type ClientOption = { id: string; name: string }

export default function QuoteEditPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [form, setForm] = useState({
    title: '', client_id: '', amount: '', expiration_date: '', status: 'pending',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const [quoteRes, clientRes] = await Promise.all([
          supabase.from('quotes').select('*').eq('id', id).single(),
          supabase.from('clients').select('id, name').order('name'),
        ])
        if (quoteRes.error) { setError(quoteRes.error.message); return }
        const q = quoteRes.data
        setForm({
          title: q.title || '', client_id: q.client_id || '',
          amount: String(q.amount ?? ''), expiration_date: q.expiration_date || '',
          status: q.status || 'pending',
        })
        setClients(clientRes.data || [])
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError(null)
    const { error: upErr } = await supabase.from('quotes').update({
      title: form.title.trim(), client_id: form.client_id || null,
      amount: form.amount ? parseFloat(form.amount) : 0,
      expiration_date: form.expiration_date || null, status: form.status,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    nav(`/quote/${id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('quotes').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { setError(delErr.message); return }
    nav('/quotes')
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="min-h-screen bg-neutral-100 p-4 pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Quote</h1>
          <button onClick={() => nav(`/quote/${id}`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Quote title" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount ($)</label>
              <input type="number" step="0.01" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiration</label>
              <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="submit" disabled={saving} className="bg-neutral-900 text-white rounded-xl px-6 py-2 text-sm disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Quote'}
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
