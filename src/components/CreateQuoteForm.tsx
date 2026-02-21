import { useState, useEffect } from 'react'
import { useLocation as useRouterLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { useCompany } from '../context/CompanyContext'

type Client = { id: string; name: string; address: string; email?: string; phone?: string }
type ServiceItem = { id: string; sourceId?: string; title?: string; name: string; description: string; price: number; quantity: number }
type SavedService = { id: string; name: string; price: number; description?: string }

export default function CreateQuoteForm({ onSuccess, prefilledClientId }: { onSuccess?: () => void; prefilledClientId?: string }) {
  const routerLocation = useRouterLocation()
  const { companyId } = useCompany()
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [lineItems, setLineItems] = useState<ServiceItem[]>([])
  const [savedServices, setSavedServices] = useState<SavedService[]>([])
  const [savedProducts, setSavedProducts] = useState<SavedService[]>([])
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [showItemEditor, setShowItemEditor] = useState(false)
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null)
  const [duration, setDuration] = useState('')
  const [startDate, setStartDate] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [taxRate, setTaxRate] = useState('0')
  const [depositPercentage, setDepositPercentage] = useState('0')
  const [showAddItemChoice, setShowAddItemChoice] = useState(false)

  // Load prefilled client if provided
  useEffect(() => {
    const params = new URLSearchParams(routerLocation.search)
    const urlClientId = params.get('clientId')
    const finalClientId = prefilledClientId || urlClientId
    
    if (finalClientId && companyId) {
      ;(async () => {
        const { data: client } = await supabase
          .from('clients')
          .select('id, name, address, email, phone')
          .eq('id', finalClientId)
          .eq('company_id', companyId)
          .single()
        
        if (client) {
          setClientId(client.id)
          setSelectedClient(client)
          setClientSearch(client.name)
        }
      })()
    }
  }, [routerLocation.search, prefilledClientId, companyId])

  // Search clients as user types
  useEffect(() => {
    if (!companyId || !clientSearch.trim()) {
      setClients([])
      setShowClientDropdown(false)
      return
    }

    const searchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, name, address, email, phone')
        .eq('company_id', companyId)
        .ilike('name', `%${clientSearch}%`)
        .limit(5)

      setClients(data || [])
      setShowClientDropdown(true)
    }

    const timeout = setTimeout(searchClients, 300)
    return () => clearTimeout(timeout)
  }, [clientSearch, companyId])

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

  const selectClient = (client: Client) => {
    setClientId(client.id)
    setSelectedClient(client)
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }

  const clearClient = () => {
    setClientId('')
    setSelectedClient(null)
    setClientSearch('')
  }

  const addServiceFromLibrary = (service: SavedService) => {
    const newItem: ServiceItem = {
      id: Date.now().toString(),
      sourceId: service.id,
      name: service.name,
      description: service.description || '',
      price: service.price,
      quantity: 1,
      title: service.name,
    }
    setEditingItem(newItem)
    setShowServiceSelector(false)
    setShowItemEditor(true)
  }

  const openNewItemEditor = () => {
    setEditingItem({
      id: Date.now().toString(),
      name: '',
      description: '',
      price: '' as any, // Empty string for cleaner UX
      quantity: 1,
      title: '',
    })
    setShowItemEditor(true)
  }

  const openEditItemEditor = (item: ServiceItem) => {
    setEditingItem({ ...item })
    setShowItemEditor(true)
  }

  const saveItem = () => {
    if (!editingItem) return
    if (!editingItem.title) {
      setError('Item title is required')
      return
    }
    const priceValue = typeof editingItem.price === 'string' ? parseFloat(editingItem.price) : editingItem.price
    if (!priceValue || priceValue <= 0) {
      setError('Price must be greater than 0')
      return
    }

    // Ensure price is a number when saving
    const itemToSave = {
      ...editingItem,
      price: priceValue,
    }

    const existingIndex = lineItems.findIndex(item => item.id === itemToSave.id)
    if (existingIndex >= 0) {
      // Update existing
      const updated = [...lineItems]
      updated[existingIndex] = itemToSave
      setLineItems(updated)
    } else {
      // Add new
      setLineItems([...lineItems, itemToSave])
    }
    
    setShowItemEditor(false)
    setEditingItem(null)
    setError(null)
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0)
  const taxPct = parseFloat(taxRate) || 0
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100
  const total = subtotal + taxAmount
  const depositPct = parseFloat(depositPercentage) || 0
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

      const { data: newQuote, error: insertErr } = await supabase
        .from('quotes')
        .insert({
          company_id: company.id,
          client_id: clientId,
          title: lineItems.map(item => item.title || item.name).join(', '),
          amount: total,
          tax_rate: parseFloat(taxRate),
          tax_amount: taxAmount,
          status: saveDraft ? 'draft' : 'pending',
          expiration_date: startDate ? new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
          deposit_amount: deposit,
          notes: clientMessage,
        })
        .select()

      if (insertErr) { setError(insertErr.message); return }
      if (!newQuote || newQuote.length === 0) { setError('Failed to create quote'); return }

      const quoteId = newQuote[0].id
      const itemsToInsert = lineItems.map((item, index) => ({
        quote_id: quoteId,
        title: item.title || null,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        sort_order: index,
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
      setTaxRate('0')
      setDepositPercentage('0')
      
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
        {/* Client Search */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Client</label>
          <div className="relative">
            <input
              type="text"
              value={clientSearch}
              onChange={e => {
                setClientSearch(e.target.value)
                if (!e.target.value.trim()) {
                  clearClient()
                }
              }}
              onFocus={() => clientSearch.trim() && setShowClientDropdown(true)}
              className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              placeholder="Search client by name..."
              required={!selectedClient}
            />
            {selectedClient && (
              <button
                type="button"
                onClick={clearClient}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Dropdown */}
          {showClientDropdown && clients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                >
                  <p className="font-medium text-sm">{client.name}</p>
                  {client.email && <p className="text-xs text-neutral-600">{client.email}</p>}
                  {client.phone && <p className="text-xs text-neutral-600">{client.phone}</p>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Client Display */}
        {selectedClient && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-900">✓ {selectedClient.name}</p>
            {selectedClient.address && <p className="text-xs text-green-700">{selectedClient.address}</p>}
          </div>
        )}

        {/* Line Items Section */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Line Items</h3>
          
          {/* Compact Line Items List */}
          {lineItems.length > 0 && (
            <div className="space-y-2 mb-3">
              {lineItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{item.title || item.name}</p>
                    {item.description && (
                      <p className="text-xs text-neutral-600 truncate">{item.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-neutral-600 whitespace-nowrap">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </div>
                  <div className="font-medium text-neutral-900 whitespace-nowrap">
                    ${(item.quantity * item.price).toFixed(2)}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditItemEditor(item)}
                    className="text-neutral-600 hover:text-neutral-900 text-xs px-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="text-neutral-400 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Button */}
          <button
            type="button"
            onClick={() => setShowAddItemChoice(true)}
            className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50 font-medium"
          >
            + Add Product or Service
          </button>
        </div>

        {/* Line Item Editor Modal */}
        {showItemEditor && editingItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowItemEditor(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="font-semibold">
                  {lineItems.find(i => i.id === editingItem.id) ? 'Edit Item' : 'Add Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowItemEditor(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Item Title</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    placeholder="e.g., Lawn Mowing"
                    value={editingItem.title || ''}
                    onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Description</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    placeholder="Brief description"
                    value={editingItem.name}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                </div>

                {/* Qty and Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={editingItem.quantity}
                      onChange={e => setEditingItem({ 
                        ...editingItem, 
                        quantity: parseInt(e.target.value) || 1 
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      value={editingItem.price}
                      onChange={e => setEditingItem({ 
                        ...editingItem, 
                        price: e.target.value as any
                      })}
                    />
                  </div>
                </div>

                {/* Total Display */}
                <div className="bg-neutral-50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Total</span>
                  <span className="text-lg font-semibold">
                    ${((editingItem.quantity || 0) * (parseFloat(editingItem.price as any) || 0)).toFixed(2)}
                  </span>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs text-neutral-600 mb-1">Notes (optional)</label>
                  <textarea
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none"
                    placeholder="Additional notes…"
                    rows={3}
                    value={editingItem.description}
                    onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-neutral-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemEditor(false)}
                  className="flex-1 border border-neutral-200 rounded-lg py-2 text-sm font-medium hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveItem}
                  className="flex-1 bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-neutral-800"
                >
                  Save Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Choice Modal */}
        {showAddItemChoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddItemChoice(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="font-semibold">Add Item</h3>
                <button
                  type="button"
                  onClick={() => setShowAddItemChoice(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItemChoice(false)
                    setShowServiceSelector(true)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-900">From Library</p>
                  <p className="text-xs text-neutral-600">Use saved products or services</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItemChoice(false)
                    openNewItemEditor()
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 rounded-lg transition-colors"
                >
                  <p className="text-sm font-medium text-neutral-900">Custom Item</p>
                  <p className="text-xs text-neutral-600">Create a one-time item</p>
                </button>
              </div>
            </div>
          </div>
        )}

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
          <div>
            <label className="block text-xs text-neutral-600 mb-1">Tax Rate (%)</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                placeholder="0"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
              />
              <span className="text-sm font-medium py-1.5 px-3 bg-white rounded border border-neutral-200">${taxAmount.toFixed(2)}</span>
            </div>
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
                placeholder="0"
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
