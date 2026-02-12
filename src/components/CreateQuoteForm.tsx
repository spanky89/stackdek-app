import { useState, useEffect } from 'react'
import { supabase } from '../api/supabaseClient'

type Client = { id: string; name: string; address: string }
type ServiceItem = { id: string; name: string; description: string; price: number }

export default function CreateQuoteForm({ onSuccess }: { onSuccess?: () => void }) {
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [services, setServices] = useState<ServiceItem[]>([{ id: '1', name: '', description: '', price: 0 }])
  const [duration, setDuration] = useState('')
  const [startDate, setStartDate] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [discount, setDiscount] = useState('0') // Editable discount amount
  const [depositPercentage, setDepositPercentage] = useState('25') // Editable deposit percentage

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
        .select('id, name, address')
        .eq('company_id', company.id)
      setClients(data || [])
    }
    loadClients()
  }, [])

  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId)
      setSelectedClient(client || null)
    } else {
      setSelectedClient(null)
    }
  }, [clientId, clients])

  const addService = () => {
    setServices([...services, { id: Date.now().toString(), name: '', description: '', price: 0 }])
  }

  const removeService = (id: string) => {
    setServices(services.filter(s => s.id !== id))
  }

  const updateService = (id: string, field: keyof ServiceItem, value: any) => {
    setServices(services.map(s => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const subtotal = services.reduce((sum, s) => sum + (s.price || 0), 0)
  const discountAmount = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)
  const depositPct = parseFloat(depositPercentage) || 25
  const deposit = Math.round(total * (depositPct / 100) * 100) / 100

  async function onSubmit(e: React.FormEvent, saveDraft: boolean) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!clientId) { setError('Client is required'); return }
    if (services.some(s => !s.name.trim())) { setError('All services require a name'); return }
    if (subtotal <= 0) { setError('Total must be greater than $0'); return }

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

      // Create quote record
      const { data: newQuote, error: insertErr } = await supabase
        .from('quotes')
        .insert({
          company_id: company.id,
          client_id: clientId,
          title: services.map(s => s.name).join(', '),
          amount: total,
          status: saveDraft ? 'draft' : 'pending',
          expiration_date: startDate ? new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        })
        .select()

      if (insertErr) { setError(insertErr.message); return }
      if (!newQuote || newQuote.length === 0) { setError('Failed to create quote'); return }

      setSuccess(true)
      setClientId('')
      setServices([{ id: '1', name: '', description: '', price: 0 }])
      setDuration('')
      setStartDate('')
      setClientMessage('')
      setDiscount('0')
      setDepositPercentage('25')
      
      // Call onSuccess after a short delay
      setTimeout(() => onSuccess?.(), 1000)
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Create Quote</h2>

      <form className="space-y-4">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Client *</label>
          <select
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            required
          >
            <option value="">— Choose a client —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client Info Display */}
        {selectedClient && (
          <div className="bg-neutral-50 rounded-lg border border-neutral-100 p-3">
            <p className="text-sm font-medium">{selectedClient.name}</p>
            <p className="text-xs text-neutral-600">{selectedClient.address}</p>
          </div>
        )}

        {/* Services */}
        <div>
          <label className="block text-sm font-medium mb-2">Services</label>
          <div className="space-y-2 mb-3">
            {services.map((service, idx) => (
              <div key={service.id} className="border border-neutral-200 rounded-lg p-3 bg-neutral-50">
                <input
                  type="text"
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm mb-2"
                  placeholder="Service name"
                  value={service.name}
                  onChange={e => updateService(service.id, 'name', e.target.value)}
                />
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm mb-2 text-xs"
                  placeholder="Description"
                  rows={2}
                  value={service.description}
                  onChange={e => updateService(service.id, 'description', e.target.value)}
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-600 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                      placeholder="$0.00"
                      value={service.price || ''}
                      onChange={e => updateService(service.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(service.id)}
                      className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addService}
            className="text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-1.5 hover:bg-neutral-50 font-medium"
          >
            + Add Service
          </button>
        </div>

        {/* Calculations */}
        <div className="bg-neutral-50 rounded-lg border border-neutral-100 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-1">Discount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={subtotal}
              className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
              placeholder="$0.00"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
          </div>
          <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-1">Required Deposit (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                placeholder="25"
                value={depositPercentage}
                onChange={e => setDepositPercentage(e.target.value)}
              />
              <span className="text-sm font-medium py-1.5 px-2 bg-white rounded border border-neutral-200">${deposit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <label className="block text-sm font-medium mb-2">Timeline</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Estimated Duration</label>
              <input
                type="text"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                placeholder="e.g. 2-3 weeks"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-600 mb-1">Estimated Start Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Client Message */}
        <div>
          <label className="block text-sm font-medium mb-2">Client Message</label>
          <textarea
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            placeholder="Add a message for your client…"
            rows={3}
            value={clientMessage}
            onChange={e => setClientMessage(e.target.value)}
          />
        </div>

        {/* Messages */}
        {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium">Quote created!</p>}

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={e => onSubmit(e, true)}
            className="flex-1 bg-white border border-neutral-200 text-neutral-900 rounded-lg py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={e => onSubmit(e, false)}
            className="flex-1 bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send Quote'}
          </button>
        </div>
      </form>
    </div>
  )
}
