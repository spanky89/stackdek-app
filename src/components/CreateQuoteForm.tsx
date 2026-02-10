import { useState, useEffect } from 'react'
import { supabase } from '../api/supabaseClient'

type Client = { id: string; name: string }

export default function CreateQuoteForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [amount, setAmount] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
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
    }
    loadClients()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!title.trim()) { setError('Quote title is required'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Valid amount is required'); return }

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

      const { error: insertErr } = await supabase.from('quotes').insert({
        company_id: company.id,
        title: title.trim(),
        client_id: clientId || null,
        amount: parseFloat(amount),
        expiration_date: expirationDate || null,
        status: 'draft',
      })

      if (insertErr) { setError(insertErr.message); return }

      setSuccess(true)
      setTitle(''); setClientId(''); setAmount(''); setExpirationDate('')
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Create New Quote</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Quote Title *</label>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bathroom Remodel Estimate" required />
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
            <label className="block text-sm mb-1">Amount ($) *</label>
            <input type="number" step="0.01" min="0.01" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Expiration Date</label>
            <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Quote created!</p>}
        <button className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60" disabled={busy} type="submit">
          {busy ? 'Creating…' : 'Create Quote'}
        </button>
      </form>
    </div>
  )
}
