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

  return (
    <AppLayout>
      <>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => nav('/quotes')} className="text-lg">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 truncate">{quote.clients?.name}</h1>
            <p className="text-xs text-neutral-600 truncate">{quote.title}</p>
          </div>
          <button onClick={() => nav(`/quote/${id}/edit`)} className="text-xs px-2 py-1 bg-neutral-900 text-white rounded">Edit</button>
          <button onClick={handleDelete} disabled={busy} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-40">Delete</button>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="space-y-2 mb-4">
            <h2 className="text-xs font-semibold text-neutral-700 mb-2">LINE ITEMS ({lineItems.length})</h2>
            {lineItems.map((item, index) => (
              <LineItemCard
                key={item.id}
                item={item}
                mode="edit"
                onUpdate={updateLineItem}
                onDelete={() => deleteLineItem(item.id)}
                onMoveUp={index > 0 ? () => moveLineItem(index, 'up') : undefined}
                onMoveDown={index < lineItems.length - 1 ? () => moveLineItem(index, 'down') : undefined}
                isFirst={index === 0}
                isLast={index === lineItems.length - 1}
              />
            ))}
          </div>
        ) || <div className="text-xs text-neutral-500 mb-4">No line items</div>}

        {/* Tax Amount - Editable */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Tax Amount</span>
            {editingTax ? (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">$</span>
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
                <button
                  onClick={saveTaxAmount}
                  disabled={busy}
                  className="px-2 py-1 bg-black text-white rounded text-sm hover:bg-gray-800"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingTax(false)
                    setTaxAmount((quote?.tax_amount ?? 0).toString())
                  }}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingTax(true)}
                className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
              >
                ${tax.toFixed(2)} <span className="text-xs">✏️</span>
              </button>
            )}
          </div>
        </div>

        {/* Summary Section */}
        <DocumentSummary
          subtotal={subtotal}
          tax={tax}
          showDepositPaid={false}
        />

        {/* Status & Deposit Section */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 my-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-neutral-600">Status: </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>
                {quote.status}
              </span>
            </div>
            {quote.deposit_paid ? (
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">✓ Deposit Paid</span>
            ) : quote.deposit_amount && quote.deposit_amount > 0 ? (
              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">Pending Payment</span>
            ) : null}
          </div>

          {/* Deposit Amount Editor */}
          {!quote.deposit_paid && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deposit Amount</label>
              <div className="flex gap-2">
                <span className="text-sm text-gray-600 py-2">$</span>
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
                  className="px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {!quote.deposit_paid && quote.deposit_amount && quote.deposit_amount > 0 && (
            <>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleStripePayment}
                  disabled={processingPayment || !stripeConnected}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processingPayment ? 'Processing...' : '💳 Pay Deposit'}
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm cursor-pointer hover:bg-neutral-200">
                  <input
                    type="checkbox"
                    onChange={markOfflinePayment}
                    disabled={busy}
                    className="w-4 h-4"
                  />
                  <span className="text-xs">Offline</span>
                </label>
              </div>
              {!stripeConnected && (
                <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                  ⚠️ <button onClick={() => nav('/settings')} className="font-semibold hover:underline">Configure Stripe</button> to accept payments
                </p>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => updateStatus('accepted')} disabled={busy || quote.status === 'accepted'}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-40">✓ Accept</button>
          <button onClick={() => updateStatus('declined')} disabled={busy || quote.status === 'declined'}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-40">✗ Decline</button>
        </div>

        {/* Share Link */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={`${window.location.origin}/quotes/view/${id}`}
              readOnly
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-600 bg-neutral-50"
            />
            <button 
              onClick={copyShareableLink}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-neutral-900 text-white hover:bg-neutral-800'
              }`}
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </>
    </AppLayout>
  )
}
