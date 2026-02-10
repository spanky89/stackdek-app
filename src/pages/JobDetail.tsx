import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Job = {
  id: string; title: string; description: string | null; date_scheduled: string
  location: string | null; estimate_amount: number; status: string
  client_id: string | null; clients: { id: string; name: string } | null
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date_scheduled: '', time_scheduled: '', location: '', estimate_amount: '', status: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('jobs').select('*, clients(id, name)').eq('id', id).single()
        if (fetchErr) { setError(fetchErr.message); return }
        setJob(data as any)
        const ds = data.date_scheduled || ''
        const [datePart, timePart] = ds.includes('T') ? ds.split('T') : [ds, '']
        setForm({
          title: data.title, description: data.description || '',
          date_scheduled: datePart, time_scheduled: timePart?.slice(0, 5) || '',
          location: data.location || '', estimate_amount: String(data.estimate_amount || ''),
          status: data.status,
        })
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function changeStatus(newStatus: string) {
    const { error: upErr } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id)
    if (upErr) { setError(upErr.message); return }
    setJob({ ...job!, status: newStatus })
    setForm({ ...form, status: newStatus })
  }

  async function saveEdit() {
    if (!form.title.trim()) return
    setSaving(true)
    const { error: upErr } = await supabase.from('jobs').update({
      title: form.title.trim(), description: form.description.trim() || null,
      date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''),
      location: form.location.trim() || null,
      estimate_amount: form.estimate_amount ? parseFloat(form.estimate_amount) : 0,
      status: form.status,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    setJob({ ...job!, title: form.title.trim(), description: form.description.trim() || null, date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''), location: form.location.trim() || null, estimate_amount: parseFloat(form.estimate_amount) || 0, status: form.status })
    setEditing(false)
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!job) return <div className="p-6">Job not found.</div>

  const statusColors: Record<string, string> = {
    scheduled: 'bg-neutral-100 text-neutral-800',
    in_progress: 'bg-neutral-100 text-neutral-800',
    completed: 'bg-neutral-100 text-neutral-800',
  }

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Job Detail</h1>
          <button onClick={() => nav('/jobs')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          {editing ? (
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" />
              <textarea className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.date_scheduled} onChange={e => setForm({ ...form, date_scheduled: e.target.value })} />
                <input type="time" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.time_scheduled} onChange={e => setForm({ ...form, time_scheduled: e.target.value })} />
              </div>
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.estimate_amount} onChange={e => setForm({ ...form, estimate_amount: e.target.value })} placeholder="Estimate" />
                <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="bg-neutral-900 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status] || 'bg-neutral-100 text-neutral-800'}`}>{job.status.replace('_', ' ')}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">Quick Edit</button>
                  <button onClick={() => nav(`/job/${id}/edit`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Full Edit</button>
                </div>
              </div>
              {job.description && <p className="text-sm text-neutral-700 mb-4">{job.description}</p>}
              <div className="space-y-1 text-sm text-neutral-600">
                <p>Date: {new Date(job.date_scheduled).toLocaleString()}</p>
                <p>Location: {job.location || '—'}</p>
                <p>Estimate: ${job.estimate_amount}</p>
                {job.clients && <p>Client: <span className="text-blue-600 cursor-pointer" onClick={() => nav(`/client/${job.clients!.id}`)}>{job.clients.name}</span></p>}
              </div>
              <div className="mt-6">
                <label className="text-sm font-medium text-neutral-600 block mb-2">Change Status</label>
                <div className="flex gap-2">
                  {['scheduled', 'in_progress', 'completed'].map(s => (
                    <button key={s} onClick={() => changeStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${job.status === s ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200'}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </>
    </AppLayout>
  )
}
