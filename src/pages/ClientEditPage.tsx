import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

export default function ClientEditPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', vip: false })

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: err } = await supabase.from('clients').select('*').eq('id', id).single()
        if (err) { setError(err.message); return }
        setForm({
          name: data.name || '', email: data.email || '',
          phone: data.phone || '', address: data.address || '', vip: data.vip ?? false,
        })
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    const { error: upErr } = await supabase.from('clients').update({
      name: form.name.trim(), email: form.email.trim() || null,
      phone: form.phone.trim() || null, address: form.address.trim() || null, vip: form.vip,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    nav(`/client/${id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this client? This cannot be undone.')) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('clients').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { setError(delErr.message); return }
    nav('/clients')
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error && loading) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="min-h-screen bg-neutral-100 p-4 pb-24">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Client</h1>
          <button onClick={() => nav(`/client/${id}`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Client name" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vip" checked={form.vip} onChange={e => setForm({ ...form, vip: e.target.checked })} />
            <label htmlFor="vip" className="text-sm font-medium">VIP Client</label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="submit" disabled={saving} className="bg-neutral-900 text-white rounded-xl px-6 py-2 text-sm disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Client'}
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
