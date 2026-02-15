import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { DocumentSummary } from '../components/DocumentSummary'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

type Job = { 
  id: string
  title: string
  estimate_amount: number
  description: string | null
  client_id: string | null
  quote_id: string | null
  clients: { id: string; name: string } | null
}

type LineItem = { 
  id: string
  title?: string
  description: string
  quantity: number
  unit_price: number
}

type SavedService = { 
  id: string
  name: string
  price: number
  description?: string 
}

export default function CreateInvoicePage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job_id')
  const urlClientId = searchParams.get('clientId')

  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [completedJobs, setCompletedJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState(jobId || '')
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [savedServices, setSavedServices] = useState<SavedService[]>([])
  const [savedProducts, setSavedProducts] = useState<SavedService[]>([])
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [taxAmount, setTaxAmount] = useState('0')
  const [depositPaidAmount, setDepositPaidAmount] = useState(0)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        setCompanyId(company.id)

        // Fetch all clients
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, email, phone')
          .eq('company_id', company.id)
          .order('name')
        setClients((clientData as Client[]) || [])

        // Fetch services and products
        const { data: services } = await supabase
          .from('services')
          .select('id, name, price, description')
          .eq('company_id', company.id)
          .order('name')
        const { data: products } = await supabase
          .from('products')
          .select('id, name, price, description')
          .eq('company_id', company.id)
          .order('name')
        setSavedServices(services || [])
        setSavedProducts(products || [])

        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, estimate_amount, description, client_id, quote_id, clients(id, name)')
          .eq('company_id', company.id)
          .eq('status', 'completed')
        setCompletedJobs((jobs as any) || [])

        // Pre-populate if job_id provided
        if (jobId) {
          const job = (jobs as any)?.find((j: Job) => j.id === jobId)
          if (job) await populateFromJob(job)
        }
        // Pre-populate if clientId provided (from URL query)
        else if (urlClientId) {
          setClientId(urlClientId)
          const client = clientData?.find((c: Client) => c.id === urlClientId)
          if (client) {
            setClientName(client.name)
            setClientSearch(client.name)
          }
        }
      } finally { setLoading(false) }
    })()
  }, [])

  async function populateFromJob(job: Job) {
    setSelectedJobId(job.id)
    setClientId(job.client_id)
    setClientName(job.clients?.name || '')

    // Fetch job_line_items if they exist
    const { data: jobLineItems } = await supabase
      .from('job_line_items')
      .select('*')
      .eq('job_id', job.id)
      .order('sort_order')

    if (jobLineItems && jobLineItems.length > 0) {
      // Pre-fill from job line items
      setLineItems(jobLineItems.map((item: any) => ({
        id: Date.now().toString() + Math.random(),
        title: item.title || '',
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })))
    } else {
      // Fallback to estimate amount (legacy jobs without line items)
      setLineItems([{ 
        id: Date.now().toString(),
        title: job.title,
        description: job.description || '', 
        quantity: 1, 
        unit_price: job.estimate_amount 
      }])
    }

    // Check if job came from a quote with paid deposit
    if (job.quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('deposit_amount, deposit_paid')
        .eq('id', job.quote_id)
        .single()

      if (quote && quote.deposit_paid && quote.deposit_amount) {
        setDepositPaidAmount(quote.deposit_amount)
      }
    }
  }

  function addServiceFromLibrary(service: SavedService) {
    const newItem: LineItem = {
      id: Date.now().toString(),
      title: service.name,
      description: service.description || '',
      quantity: 1,
      unit_price: service.price,
    }
    setLineItems([...lineItems, newItem])
    setShowServiceSelector(false)
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  async function handleClientSelect(cid: string) {
    const client = clients.find(c => c.id === cid)
    if (!client) return
    setClientId(cid)
    setClientName(client.name)
    setClientSearch(client.name)
    
    // Fetch completed jobs for this client
    if (!companyId) return
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, estimate_amount, description, client_id, quote_id, clients(id, name)')
      .eq('company_id', companyId)
      .eq('client_id', cid)
      .eq('status', 'completed')
    setCompletedJobs((jobs as any) || [])
    setSelectedJobId('') // Reset job selection
  }

  async function handleJobSelect(jid: string) {
    setSelectedJobId(jid)
    const job = completedJobs.find(j => j.id === jid)
    if (job) await populateFromJob(job)
  }

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)
  const tax = parseFloat(taxAmount) || 0
  const totalDue = subtotal + tax - depositPaidAmount

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setError(null)
    setBusy(true)
    try {
      // Generate invoice number
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`

      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        company_id: companyId,
        client_id: clientId,
        job_id: selectedJobId || null,
        invoice_number: invoiceNumber,
        total_amount: totalDue,
        tax_amount: tax,
        deposit_paid_amount: depositPaidAmount,
        status: 'draft',
      }).select().single()

      if (invErr) { setError(invErr.message); return }

      // Insert line items
      const items = lineItems.map((li, idx) => ({
        invoice_id: invoice.id,
        title: li.title || null,
        description: li.description || '',
        quantity: li.quantity,
        unit_price: li.unit_price,
        sort_order: idx,
      }))

      if (items.length > 0) {
        const { error: liErr } = await supabase.from('invoice_line_items').insert(items)
        if (liErr) { setError(liErr.message); return }
      }

      nav('/invoices')
    } catch (e: any) { setError(e?.message ?? 'Unknown error') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <button onClick={() => nav('/invoices')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1 font-medium">Select a Client</label>
            <input
              type="text"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm"
              placeholder="Search clients..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
            {clientSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg bg-white">
                {clients
                  .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                              c.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                              c.phone?.includes(clientSearch))
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleClientSelect(c.id)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-neutral-100 last:border-b-0"
                    >
                      <div className="font-medium text-sm">{c.name}</div>
                      {(c.email || c.phone) && (
                        <div className="text-xs text-gray-500">
                          {c.email} {c.phone && `• ${c.phone}`}
                        </div>
                      )}
                    </button>
                  ))
                }
              </div>
            )}
          </div>

          {clientName && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">
                  📋 Client: {clientName}
                </p>
              </div>

              {completedJobs.length > 0 && (
                <div>
                  <label className="block text-sm mb-1 font-medium">From Completed Job (Optional)</label>
                  <select 
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
                    value={selectedJobId} 
                    onChange={e => handleJobSelect(e.target.value)}
                  >
                    <option value="">— Start from scratch —</option>
                    {completedJobs.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.title} — ${j.estimate_amount?.toLocaleString() ?? '0'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {depositPaidAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700 font-medium">
                💰 Deposit already paid: ${depositPaidAmount.toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                This will be deducted from the total due.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm mb-2 font-medium">Line Items</label>
            <div className="space-y-3 mb-4">
              {lineItems.map((li) => (
                <div key={li.id} className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{li.title}</p>
                      {li.description && <p className="text-xs text-neutral-600">{li.description}</p>}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeLineItem(li.id)} 
                      className="text-neutral-400 hover:text-red-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <input 
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" 
                    value={li.title || ''} 
                    onChange={e => updateLine(li.id, 'title', e.target.value)} 
                    placeholder="Item Title"
                  />
                  <textarea 
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-none" 
                    value={li.description} 
                    onChange={e => updateLine(li.id, 'description', e.target.value)} 
                    placeholder="Description"
                    rows={2}
                  />
                  <div className="flex gap-2 items-center">
                    <div className="w-20">
                      <label className="block text-xs text-neutral-600 mb-1">Qty</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm text-center" 
                        value={li.quantity} 
                        onChange={e => updateLine(li.id, 'quantity', parseInt(e.target.value) || 1)} 
                      />
                    </div>
                    <span className="text-sm text-gray-500 mt-5">×</span>
                    <div className="flex-1">
                      <label className="block text-xs text-neutral-600 mb-1">Price</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" 
                        value={li.unit_price} 
                        onChange={e => updateLine(li.id, 'unit_price', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                    <span className="text-sm text-gray-500 mt-5">=</span>
                    <div className="w-24">
                      <label className="block text-xs text-neutral-600 mb-1">Total</label>
                      <div className="font-medium text-sm text-right py-2">
                        ${(li.quantity * li.unit_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={() => setShowServiceSelector(true)} 
              className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50 font-medium"
            >
              + Add Service/Product
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
                  {[...savedServices, ...savedProducts].length === 0 ? (
                    <div className="p-4 text-center text-sm text-neutral-600">
                      No services or products yet. Add some in Settings.
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-200">
                      {[...savedServices, ...savedProducts].map(service => (
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

          <div>
            <label className="block text-sm font-medium mb-1">Tax Amount ($)</label>
            <input 
              type="number" 
              min="0" 
              step="0.01"
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
              value={taxAmount} 
              onChange={e => setTaxAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Document Summary */}
          <DocumentSummary
            subtotal={subtotal}
            tax={tax}
            depositPaid={depositPaidAmount}
            showDepositPaid={depositPaidAmount > 0}
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button 
            className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60 font-medium" 
            disabled={busy || !clientId || lineItems.length === 0} 
            type="submit"
          >
            {busy ? 'Creating…' : 'Create Invoice (Draft)'}
          </button>
        </form>
      </>
    </AppLayout>
  )
}
