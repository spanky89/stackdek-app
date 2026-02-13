import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type Client = { id: string; name: string }

export default function CreateJobForm({ onSuccess, prefilledClientId }: { onSuccess?: () => void; prefilledClientId?: string }) {
  const location = useLocation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateScheduled, setDateScheduled] = useState('')
  const [timeScheduled, setTimeScheduled] = useState('')
  const [location, setLocation] = useState('')
  const [clientId, setClientId] = useState('')
  const [estimateAmount, setEstimateAmount] = useState('')
  const [status, setStatus] = useState('scheduled')
  const [clients, setClients] = useState<Client[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadClients = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      if (!company) return
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', company.id)
      setClients(data || [])

      // Pre-fill client ID if passed via URL params or prop
      const params = new URLSearchParams(location.search)
      const urlClientId = params.get('clientId')
      const finalClientId = prefilledClientId || urlClientId
      if (finalClientId) {
        setClientId(finalClientId)
      }
    }
    loadClients()
  }, [location.search, prefilledClientId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!title.trim()) { setError('Job title is required'); return }
    if (!dateScheduled) { setError('Date is required'); return }

    setBusy(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); return }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      if (!company) { setError('No company found'); return }

      const { error: insertErr } = await supabase.from('jobs').insert({
        company_id: company.id,
        title: title.trim(),
        description: description.trim() || null,
        date_scheduled: dateScheduled + (timeScheduled ? `T${timeScheduled}` : ''),
        location: location.trim() || null,
        client_id: clientId || null,
        estimate_amount: estimateAmount ? parseFloat(estimateAmount) : 0,
        status,
      })

      if (insertErr) { setError(insertErr.message); return }

      setSuccess(true)
      setTitle(''); setDescription(''); setDateScheduled(''); setTimeScheduled('')
      setLocation(''); setClientId(''); setEstimateAmount(''); setStatus('scheduled')
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Create New Job</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Job Title *</label>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Kitchen Renovation" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Job details…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Date *</label>
            <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={dateScheduled} onChange={e => setDateScheduled(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Time</label>
            <input type="time" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={timeScheduled} onChange={e => setTimeScheduled(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Location</label>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={location} onChange={e => setLocation(e.target.value)} placeholder="123 Main St" />
        </div>
        <div>
          <label className="block text-sm mb-1">Client</label>
          <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— None —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Estimate ($)</label>
            <input type="number" step="0.01" min="0" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={estimateAmount} onChange={e => setEstimateAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Job created!</p>}
        <button className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60" disabled={busy} type="submit">
          {busy ? 'Creating…' : 'Create Job'}
        </button>
      </form>
    </div>
  )
}
