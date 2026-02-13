import { useState, useEffect } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { useCompany } from '../context/CompanyContext'

type Client = { id: string; name: string; address: string }
type ServiceItem = { id: string; sourceId?: string; name: string; description: string; price: number; quantity: number }
type SavedService = { id: string; name: string; price: number; description?: string }

export default function CreateQuoteForm({ onSuccess, prefilledClientId }: { onSuccess?: () => void; prefilledClientId?: string }) {
  const routerLocation = useRouterLocation()
  const { companyId } = useCompany()
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [lineItems, setLineItems] = useState<ServiceItem[]>([])
  const [savedServices, setSavedServices] = useState<SavedService[]>([])
  const [savedProducts, setSavedProducts] = useState<SavedService[]>([])
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [duration, setDuration] = useState('')
  const [startDate, setStartDate] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [taxRate, setTaxRate] = useState('10') // Editable tax rate
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

      // Pre-fill client ID if passed via URL params or prop
      const params = new URLSearchParams(routerLocation.search)
      const urlClientId = params.get('clientId')
      const finalClientId = prefilledClientId || urlClientId
      if (finalClientId) {
        setClientId(finalClientId)
      }
    }
    loadClients()
  }, [routerLocation.search, prefilledClientId])

  useEffect(() => {
    const loadSavedServices = async () => {
      if (!companyId) return
      const { data: services } = await supabase
        .from('services')
        .select('id, name, price, description')
        .eq('company_id', companyId)
        .order('name')
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, description')
        .eq('company_id', companyId)
        .order('name')
      setSavedServices(services || [])
      setSavedProducts(products || [])
    }
    loadSavedServices()
  }, [companyId])

  useEffect(() => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId)
      setSelectedClient(client || null)
    } else {
      setSelectedClient(null)
    }
  }, [clientId, clients])

  const addServiceFromLibrary = (service: SavedService) => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      sourceId: service.id,
      name: service.name,
      description: service.description || '',
      price: service.price,
      quantity: 1,
    }
    setLineItems([...lineItems, newItem])
    setShowServiceSelector(false)
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const updateLineItem = (id: string, field: keyof ServiceItem, value: any) => {
    setLineItems(lineItems.map(item => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0)
  const taxPct = parseFloat(taxRate) || 10
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100
  const total = subtotal + taxAmount
  const depositPct = parseFloat(depositPercentage) || 25
  const deposit = Math.round(total * (depositPct / 100) * 100) / 100

  async function onSubmit(e: React.FormEvent, saveDraft: boolean) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!clientId) { setError('Client is required'); return }
    if (lineItems.length === 0) { setError('At least one service is required'); return }
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
          title: lineItems.map(item => item.name).join(', '),
          amount: total,
          tax_rate: parseFloat(taxRate),
          status: saveDraft ? 'draft' : 'pending',
          expiration_date: startDate ? new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
          deposit_amount: deposit,
          notes: clientMessage,
        })
        .select()

      if (insertErr) { setError(insertErr.message); return }
      if (!newQuote || newQuote.length === 0) { setError('Failed to create quote'); return }

      // Store line items
      const quoteId = newQuote[0].id
      const itemsToInsert = lineItems.map(item => ({
        quote_id: quoteId,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.description,
      }))

      const { error: itemsErr } = await supabase
        .from('quote_line_items')
        .insert(itemsToInsert)

      if (itemsErr) { setError('Failed to create line items: ' + itemsErr.message); return }

      setSuccess(true)
      setClientId('')
      setLineItems([])
      setDuration('')
      setStartDate('')
      setClientMessage('')
      setTaxRate('10')
      setDepositPercentage('25')
      
      // Call onSuccess after a short delay
      setTimeout(() => onSuccess?.(), 1000)
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  const allServices = [...savedServices, ...savedProducts]

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <h2 className="text-lg font-semibold mb-6">Create Quote</h2>

      <form className="space-y-6">
        {/* Client Selection */}
        <div>
          <select
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            required
          >
            <option value="">Select a Client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Client Info Display (no avatar) */}
        {selectedClient && (
          <div className="bg-neutral-50 rounded-lg border border-neutral-100 p-4">
            <p className="text-sm font-semibold text-neutral-900">{selectedClient.name}</p>
            <p className="text-xs text-neutral-600">{selectedClient.address}</p>
          </div>
        )}

        {/* Services Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Services</h3>
          <div className="space-y-2 mb-4">
            {lineItems.map((item) => (
              <div key={item.id} className="border border-neutral-200 rounded-lg p-4 bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                    {item.description && <p className="text-xs text-neutral-600">{item.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="text-neutral-400 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                      value={item.quantity}
                      onChange={e => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                      value={item.price}
                      onChange={e => updateLineItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Total</label>
                    <div className="px-2 py-1.5 text-sm font-medium">${(item.quantity * item.price).toFixed(2)}</div>
                  </div>
                </div>
                <textarea
                  className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-xs mt-2 resize-none"
                  placeholder="Additional notes…"
                  rows={2}
                  value={item.description}
                  onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowServiceSelector(true)}
            className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50 font-medium flex items-center justify-center gap-2"
          >
            + Add Service
          </button>
        </div>

        {/* Service Selector Modal */}
        {showServiceSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowServiceSelector(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-96 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="font-semibold">Select Service or Product</h3>
                <button
                  type="button"
                  onClick={() => setShowServiceSelector(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {allServices.length === 0 ? (
                  <div className="p-4 text-center text-sm text-neutral-600">
                    No services or products yet. Add some in Settings.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200">
                    {allServices.map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addServiceFromLibrary(service)}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-neutral-900">{service.name}</p>
                        <p className="text-xs text-neutral-600">${service.price.toFixed(2)}</p>
                        {service.description && <p className="text-xs text-neutral-500 mt-1">{service.description}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calculations */}
        <div className="bg-neutral-50 rounded-lg border border-neutral-100 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Tax ({taxRate}%)</span>
            <span className="font-medium">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="border-t border-neutral-200 pt-2 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div>
            <label className="block text-xs text-neutral-600 mb-1">Required Deposit</label>
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
              <span className="text-sm font-medium py-1.5 px-3 bg-white rounded border border-neutral-200">${deposit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Timeline</h3>
          <div className="space-y-2">
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
          <h3 className="text-sm font-semibold mb-2">Client Message</h3>
          <textarea
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none"
            placeholder="Add a message for your client…"
            rows={4}
            value={clientMessage}
            onChange={e => setClientMessage(e.target.value)}
          />
        </div>

        {/* Messages */}
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium bg-green-50 p-3 rounded-lg">Quote created!</p>}

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200">
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
