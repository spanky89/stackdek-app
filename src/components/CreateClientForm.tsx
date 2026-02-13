import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useCompany } from '../context/CompanyContext'

export default function CreateClientForm({ onSuccess }: { onSuccess?: () => void }) {
  const { companyId, error: companyError, loading: companyLoading } = useCompany()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('United States')
  const [vip, setVip] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!name.trim()) { setError('Client name is required'); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email format'); return }
    if (!companyId) { setError('Company not initialized'); return }

    setBusy(true)
    try {
      console.log('Creating client with company_id:', companyId)

      // Build full address
      const fullAddress = [address, address2, city, state, zipCode, country]
        .filter(v => v.trim())
        .join(', ')

      const { data, error: insertErr } = await supabase.from('clients').insert({
        company_id: companyId,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: fullAddress || null,
        vip,
      }).select()

      console.log('Insert response:', { data, insertErr })

      if (insertErr) { 
        console.error('Insert error:', insertErr)
        setError(`Error: ${insertErr.message}`)
        return 
      }

      setSuccess(true)
      setName(''); setEmail(''); setPhone(''); setAddress(''); setAddress2(''); setCity(''); setState(''); setZipCode(''); setCountry('United States'); setVip(false)
      setTimeout(() => {
        console.log('Calling onSuccess callback')
        onSuccess?.()
      }, 800)
    } catch (e: any) {
      console.error('Exception:', e)
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  if (companyLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Client</h2>
        <p className="text-neutral-600 text-sm">Initializing…</p>
      </div>
    )
  }

  if (companyError) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Client</h2>
        <p className="text-red-600 text-sm">Error: {companyError}</p>
      </div>
    )
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
        
        {/* Address Section */}
        <div className="pt-2 border-t border-neutral-200">
          <div>
            <label className="block text-sm mb-1">Property Address *</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" required />
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">Address Line 2</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={address2} onChange={e => setAddress2(e.target.value)} placeholder="Apt, Suite, etc." />
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">City</label>
            <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">State</label>
              <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={state} onChange={e => setState(e.target.value)}>
                <option value="">Select...</option>
                {usStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Zip Code</label>
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="12345" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">Country</label>
            <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={country} onChange={e => setCountry(e.target.value)}>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Mexico">Mexico</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="vip" className="rounded border-neutral-200" checked={vip} onChange={e => setVip(e.target.checked)} />
          <label htmlFor="vip" className="text-sm">VIP Client</label>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Client created!</p>}
        <button className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60" disabled={busy || companyLoading || !companyId} type="submit">
          {busy ? 'Creating…' : 'Create Client'}
        </button>
      </form>
    </div>
  )
}
