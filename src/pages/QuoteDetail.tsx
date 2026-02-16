import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { LineItemCard } from '../components/LineItemCard'
import { DocumentSummary } from '../components/DocumentSummary'
import { UnifiedLineItem } from '../types/lineItems'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; client_id: string | null
  company_id: string | null
  deposit_amount: number | null; deposit_paid: boolean
  stripe_checkout_session_id: string | null
  tax_rate: number | null
  tax_amount: number | null
  clients: { id: string; name: string; email?: string } | null
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [depositAmount, setDepositAmount] = useState<string>('0')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [taxAmount, setTaxAmount] = useState<string>('0')
  const [editingTax, setEditingTax] = useState(false)

  useEffect(() => {
    // Check for payment success/cancel in URL
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      console.log('Payment successful!')
    } else if (paymentStatus === 'cancelled') {
      console.log('Payment cancelled')
    }
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('quotes')
          .select('id, title, status, amount, expiration_date, client_id, company_id, deposit_amount, deposit_paid, stripe_checkout_session_id, tax_rate, tax_amount, clients(id, name, email)')
          .eq('id', id)
          .single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
        
        // Set tax amount (default to 0)
        setTaxAmount((data.tax_amount ?? 0).toString())
        
        // Fetch line items with title field
        const { data: items, error: itemsErr } = await supabase
          .from('quote_line_items')
          .select('id, title, description, quantity, unit_price, sort_order')
          .eq('quote_id', id)
          .order('sort_order', { ascending: true })
        if (itemsErr) { 
          console.error('Line items error:', itemsErr)
        }
        setLineItems((items || []).map((item, index) => ({
          ...item,
          sort_order: item.sort_order ?? index
        })))
        
        // Set deposit amount (default to 0)
        setDepositAmount((data.deposit_amount ?? 0).toString())
        
        // Check Stripe connection status
        await checkStripeConnection()
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function checkStripeConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: company } = await supabase
        .from('companies')
        .select('stripe_publishable_key, stripe_secret_key')
        .eq('owner_id', user.id)
        .single()
      
      setStripeConnected(!!(company?.stripe_publishable_key && company?.stripe_secret_key))
    } catch (e) {
      console.error('Error checking Stripe connection:', e)
    } finally {
      setCheckingStripe(false)
    }
  }

  async function updateStatus(newStatus: string) {
    setBusy(true)
    const { error: upErr } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id)
    setBusy(false)
    if (upErr) { setError(upErr.message); return }
    setQuote({ ...quote!, status: newStatus })
  }

  async function saveDepositAmount() {
    const parsedDeposit = parseFloat(depositAmount)
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      setError('Please enter a valid deposit amount')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ deposit_amount: parsedDeposit })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, deposit_amount: parsedDeposit })
  }

  async function saveTaxAmount() {
    const parsedTax = parseFloat(taxAmount)
    if (isNaN(parsedTax) || parsedTax < 0) {
      setError('Please enter a valid tax amount')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ tax_amount: parsedTax })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, tax_amount: parsedTax })
    setEditingTax(false)
  }

  async function updateLineItem(updated: UnifiedLineItem) {
    setBusy(true)
    const { error: upErr } = await supabase
      .from('quote_line_items')
      .update({
        title: updated.title,
        description: updated.description,
        quantity: updated.quantity,
        unit_price: updated.unit_price
      })
      .eq('id', updated.id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setLineItems(lineItems.map(item => item.id === updated.id ? updated : item))
  }

  async function deleteLineItem(itemId: string) {
    if (!confirm('Delete this line item?')) return
    
    setBusy(true)
    const { error: delErr } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('id', itemId)
    
    setBusy(false)
    if (delErr) { 
      setError(delErr.message)
      return 
    }
    
    setLineItems(lineItems.filter(item => item.id !== itemId))
  }

  async function moveLineItem(index: number, direction: 'up' | 'down') {
    const newItems = [...lineItems]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= newItems.length) return
    
    // Swap items
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp
    
    // Update sort_order for both items
    newItems[index].sort_order = index
    newItems[targetIndex].sort_order = targetIndex
    
    setBusy(true)
    
    // Update both items in database
    const updates = [
      supabase.from('quote_line_items').update({ sort_order: index }).eq('id', newItems[index].id),
      supabase.from('quote_line_items').update({ sort_order: targetIndex }).eq('id', newItems[targetIndex].id)
    ]
    
    const results = await Promise.all(updates)
    const errors = results.filter(r => r.error)
    
    setBusy(false)
    
    if (errors.length > 0) {
      setError('Failed to reorder items')
      return
    }
    
    setLineItems(newItems)
  }

  async function handleStripePayment() {
    if (!quote?.deposit_amount || quote.deposit_amount <= 0) {
      setError('Please set a deposit amount first')
      return
    }

    if (!stripeConnected) {
      setError('Stripe not configured. Please configure in Settings > Payment Settings')
      return
    }

    setProcessingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setProcessingPayment(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('owner_id', user?.id)
        .single()

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          quoteId: id,
          depositAmount: quote.deposit_amount,
          clientEmail: quote.clients?.email || '',
          clientName: quote.clients?.name || '',
          companyName: company?.name || 'StackDek Job',
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment')
      setProcessingPayment(false)
    }
  }

  async function markOfflinePayment() {
    if (!quote) return
    
    setBusy(true)
    setError(null)
    
    try {
      const { error: upErr } = await supabase
        .from('quotes')
        .update({ 
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (upErr) throw new Error(`Failed to mark deposit paid: ${upErr.message}`)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const jobData = {
        quote_id: quote.id,
        title: quote.title,
        client_id: quote.client_id,
        company_id: quote.company_id,
        status: 'scheduled',
        date_scheduled: tomorrow.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      }
      
      const { data: newJob, error: jobErr } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single()

      if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`)
      if (!newJob) throw new Error('Job created but no data returned')

      setQuote({ ...quote, deposit_paid: true })
      setBusy(false)
      
      alert(`✓ Deposit marked as paid. Job created!`)
      nav('/jobs')
    } catch (err: any) {
      console.error('[markOfflinePayment] ERROR:', err)
      setError(err.message || 'Failed to process offline payment')
      setBusy(false)
    }
  }

  function copyShareableLink() {
    const shareUrl = `${window.location.origin}/quotes/view/${id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this quote? This cannot be undone.')) return

    setBusy(true)
    setError(null)
    try {
      const { error: itemsErr } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id)
      
      if (itemsErr) {
        console.error('Error deleting line items:', itemsErr)
        throw new Error(`Failed to delete line items: ${itemsErr.message}`)
      }

      const { error: delErr } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)
      
      if (delErr) {
        console.error('Error deleting quote:', delErr)
        throw new Error(`Failed to delete quote: ${delErr.message}`)
      }

      nav('/quotes')
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err?.message || 'Failed to delete quote')
      setBusy(false)
      alert(`Delete failed: ${err?.message || 'Unknown error'}`)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!quote) return <div className="p-6">Quote not found.</div>

  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-800',
    sent: 'bg-neutral-100 text-neutral-800',
    accepted: 'bg-neutral-100 text-neutral-800',
    declined: 'bg-neutral-100 text-neutral-800',
    expired: 'bg-neutral-100 text-neutral-800',
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const tax = quote?.tax_amount ?? 0
  const total = subtotal + tax
  const depositRequired = quote?.deposit_amount ?? 0

  return (
    <AppLayout>
      <>
        {/* Back Button & Menu */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => nav('/quotes')} className="text-neutral-700 text-2xl leading-none">←</button>
          <div className="flex gap-2">
            <button onClick={() => nav(`/quote/${id}/edit`)} className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium">
              Edit
            </button>
            <button onClick={handleDelete} disabled={busy} className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-40">
              Delete
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </span>
        </div>

        {/* Hero Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            Quote for {quote.clients?.name} for ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <p className="text-neutral-600">{quote.title}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <span className="text-neutral-500 block mb-1">Created</span>
            <p className="font-medium">{new Date(quote.expiration_date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div>
            <span className="text-neutral-500 block mb-1">Viewed</span>
            <p className="font-medium">—</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => updateStatus('accepted')} 
            disabled={busy || quote.status === 'accepted'}
            className="px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-40"
          >
            Approve
          </button>
          <button 
            onClick={copyShareableLink}
            className="px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            {copied ? 'Link Copied!' : 'Resend'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 mb-6">
          <button className="px-6 py-3 text-sm font-semibold text-neutral-900 border-b-2 border-red-700">
            Quote
          </button>
          <button className="px-6 py-3 text-sm font-medium text-neutral-500">
            Notes
          </button>
        </div>

        {/* Product / Service Label */}
        <div className="mb-3">
          <h3 className="text-sm text-neutral-500 font-medium">Product / Service</h3>
        </div>

        {/* Line Items Section */}
        <div className="bg-white border-t border-b border-neutral-200 py-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Line items</h2>
            <button onClick={() => nav(`/quote/${id}/edit`)} className="text-green-600 text-3xl leading-none font-light">+</button>
          </div>
          
          {lineItems.length > 0 ? (
            <div className="space-y-4">
              {lineItems.map((item) => (
                <div key={item.id} className="border-b border-neutral-100 last:border-b-0 pb-4 last:pb-0">
                  <h3 className="font-semibold text-neutral-900 mb-1">{item.title || 'Untitled Item'}</h3>
                  {item.description && (
                    <p className="text-sm text-neutral-600 mb-2">{item.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">
                      {item.quantity} × ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-semibold text-neutral-900">
                      ${(item.quantity * item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-4">No line items</p>
          )}
        </div>

        {/* Financial Summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-neutral-900 font-medium">Subtotal</span>
            <span className="font-semibold text-neutral-900">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-900 font-medium">Tax</span>
            {editingTax ? (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-neutral-600">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-24 px-2 py-1 text-sm rounded border border-neutral-300"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTaxAmount()
                    if (e.key === 'Escape') {
                      setEditingTax(false)
                      setTaxAmount((quote?.tax_amount ?? 0).toString())
                    }
                  }}
                  autoFocus
                />
                <button onClick={saveTaxAmount} disabled={busy} className="px-2 py-1 bg-neutral-900 text-white rounded text-xs">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingTax(true)} className="font-semibold text-green-600">
                ${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </button>
            )}
          </div>

          <div className="bg-neutral-50 -mx-4 px-4 py-3 flex justify-between items-center">
            <span className="text-lg font-bold text-neutral-900">Total</span>
            <span className="text-lg font-bold text-neutral-900">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          {depositRequired > 0 && (
            <div className="bg-neutral-50 -mx-4 px-4 py-3 flex justify-between items-center border-t border-neutral-200">
              <span className="font-bold text-neutral-900">Required deposit</span>
              <span className="font-bold text-green-600">${depositRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {/* Deposit Payment Settings */}
        {!quote.deposit_paid && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Deposit payment settings</h2>
            
            <div className="mb-4">
              <label className="block text-sm text-neutral-600 mb-2">Set deposit amount</label>
              <div className="flex gap-2">
                <span className="text-sm text-neutral-600 py-2">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="flex-1 px-3 py-2 text-sm rounded border border-neutral-300"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <button
                  onClick={saveDepositAmount}
                  disabled={busy}
                  className="px-4 py-2 bg-neutral-900 text-white rounded text-sm hover:bg-neutral-800 disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            </div>

            {quote.deposit_amount && quote.deposit_amount > 0 && (
              <>
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Accept card payments</span>
                    <span className="font-medium">{stripeConnected ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleStripePayment}
                    disabled={processingPayment || !stripeConnected}
                    className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {processingPayment ? 'Processing...' : 'Pay with Card'}
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm cursor-pointer hover:bg-neutral-200">
                    <input
                      type="checkbox"
                      onChange={markOfflinePayment}
                      disabled={busy}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-medium">Mark Paid</span>
                  </label>
                </div>
                {!stripeConnected && (
                  <p className="text-xs text-neutral-600 mt-2">
                    <button onClick={() => nav('/settings')} className="font-semibold hover:underline">Configure payment settings</button> to accept card payments
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </>
    </AppLayout>
  )
}
