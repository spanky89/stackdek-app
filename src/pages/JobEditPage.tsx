import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type ClientOption = { id: string; name: string }

export default function JobEditPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [form, setForm] = useState({
    title: '', description: '', date_scheduled: '', time_scheduled: '',
    location: '', client_id: '', estimate_amount: '', status: 'scheduled',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const [jobRes, clientRes] = await Promise.all([
          supabase.from('jobs').select('*').eq('id', id).single(),
          supabase.from('clients').select('id, name').order('name'),
        ])
        if (jobRes.error) { setError(jobRes.error.message); return }
        const j = jobRes.data
        const ds = j.date_scheduled || ''
        const [datePart, timePart] = ds.includes('T') ? ds.split('T') : [ds, '']
        setForm({
          title: j.title || '', description: j.description || '',
          date_scheduled: datePart, time_scheduled: timePart?.slice(0, 5) || '',
          location: j.location || '', client_id: j.client_id || '',
          estimate_amount: String(j.estimate_amount ?? ''), status: j.status || 'scheduled',
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
    const { error: upErr } = await supabase.from('jobs').update({
      title: form.title.trim(), description: form.description.trim() || null,
      date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''),
      location: form.location.trim() || null,
      client_id: form.client_id || null,
      estimate_amount: form.estimate_amount ? parseFloat(form.estimate_amount) : 0,
      status: form.status,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    nav(`/job/${id}`)
  }

  async function handleDelete() {
    if (!confirm('Delete this job? This cannot be undone.')) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('jobs').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { setError(delErr.message); return }
    nav('/jobs')
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Job</h1>
          <button onClick={() => nav(`/job/${id}`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Job title" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Job description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.date_scheduled} onChange={e => setForm({ ...form, date_scheduled: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input type="time" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.time_scheduled} onChange={e => setForm({ ...form, time_scheduled: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" />
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
              <label className="block text-sm font-medium mb-1">Estimate ($)</label>
              <input type="number" step="0.01" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.estimate_amount} onChange={e => setForm({ ...form, estimate_amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button type="submit" disabled={saving} className="bg-neutral-900 text-white rounded-xl px-6 py-2 text-sm disabled:opacity-60">
              {saving ? 'Saving…' : 'Update Job'}
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </>
    </AppLayout>
  )
}
