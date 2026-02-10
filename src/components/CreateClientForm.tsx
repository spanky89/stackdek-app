import { useState } from 'react'
import { supabase } from '../api/supabaseClient'

export default function CreateClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [vip, setVip] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!name.trim()) { setError('Client name is required'); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return }

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

      const { error: insertErr } = await supabase.from('clients').insert({
        company_id: company.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        vip,
      })

      if (insertErr) { setError(insertErr.message); return }

      setSuccess(true)
      setName(''); setEmail(''); setPhone(''); setAddress(''); setVip(false)
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Create New Client</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Name *</label>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input type="tel" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, ST" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="vip" className="rounded border-neutral-200" checked={vip} onChange={e => setVip(e.target.checked)} />
          <label htmlFor="vip" className="text-sm">VIP Client</label>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Client created!</p>}
        <button className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60" disabled={busy} type="submit">
          {busy ? 'Creating…' : 'Create Client'}
        </button>
      </form>
    </div>
  )
}
