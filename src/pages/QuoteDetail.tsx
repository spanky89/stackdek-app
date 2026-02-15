import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; client_id: string | null
  company_id: string | null
  deposit_amount: number | null; deposit_paid: boolean
  stripe_checkout_session_id: string | null
  tax_rate: number | null
  clients: { id: string; name: string; email?: string } | null
}

type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [checkingStripe, setCheckingStripe] = useState(true)

  useEffect(() => {
    // Check for payment success/cancel in URL
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      // Show success message (could be a toast notification)
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
          .select('id, title, status, amount, expiration_date, client_id, company_id, deposit_amount, deposit_paid, stripe_checkout_session_id, tax_rate, clients(id, name, email)')
          .eq('id', id)
          .single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
        
        // Fetch line items
        const { data: items, error: itemsErr } = await supabase
          .from('quote_line_items')
          .select('id, description, quantity, unit_price')
          .eq('quote_id', id)
          .order('created_at', { ascending: true })
        if (itemsErr) { 
          console.error('Line items error:', itemsErr)
          // Don't return error - line items are optional
        }
        console.log('Fetched line items:', items)
        setLineItems(items || [])
        
        // Set deposit amount if already exists
        if (data.deposit_amount) {
          setDepositAmount(data.deposit_amount.toString())
        }
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
      
      // Check if both keys are configured
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
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError('Please enter a valid deposit amount')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ deposit_amount: parseFloat(depositAmount) })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, deposit_amount: parseFloat(depositAmount) })
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
      // Get auth session for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setProcessingPayment(false)
        return
      }

      // Get company info for better payment description
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
          'Authorization': `Bearer ${session.access_token}`, // Pass auth token
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

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment')
      setProcessingPayment(false)
    }
  }

  async function markOfflinePayment() {
    console.log('[markOfflinePayment] Called with quote:', quote)
    if (!quote) {
      console.log('[markOfflinePayment] Quote is null, returning')
      return
    }
    
    setBusy(true)
    setError(null)
    
    try {
      console.log('[markOfflinePayment] Step 1: Marking deposit as paid...')
      // 1. Mark deposit as paid
      const { error: upErr } = await supabase
        .from('quotes')
        .update({ 
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (upErr) throw new Error(`Failed to mark deposit paid: ${upErr.message}`)
      console.log('[markOfflinePayment] Step 1 complete: Deposit marked as paid')

      // 2. Create job from quote
      console.log('[markOfflinePayment] Step 2: Creating job with data:', {
        quote_id: quote.id,
        title: quote.title,
        client_id: quote.client_id,
        company_id: quote.company_id,
      })
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const jobData = {
        quote_id: quote.id,
        title: quote.title,
        client_id: quote.client_id,
        company_id: quote.company_id,
        status: 'scheduled',  // Use 'scheduled' instead of 'pending'
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
      
      console.log('[markOfflinePayment] Step 2 complete: Job created:', newJob.id)

      setQuote({ ...quote, deposit_paid: true })
      setBusy(false)
      
      // Show success and navigate
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
      // Delete line items first
      const { error: itemsErr } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id)
      
      if (itemsErr) {
        console.error('Error deleting line items:', itemsErr)
        throw new Error(`Failed to delete line items: ${itemsErr.message}`)
      }

      // Then delete the quote
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
  const taxRate = quote?.tax_rate || 0
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

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
            {lineItems.map((item) => (
              <div key={item.id} className="bg-white rounded border border-neutral-200 p-3">
                <div className="font-semibold text-sm text-neutral-900 mb-1">{item.description}</div>
                <div className="flex justify-between items-center text-xs text-neutral-600">
                  <span>{item.quantity} × ${item.unit_price.toFixed(2)}</span>
                  <span className="font-semibold text-neutral-900">${(item.quantity * item.unit_price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) || <div className="text-xs text-neutral-500 mb-4">No line items</div>}

        {/* Summary Section */}
        <div className="bg-white rounded border border-neutral-200 p-3 space-y-1 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-semibold text-neutral-900">${subtotal.toFixed(2)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-neutral-600">Tax ({taxRate}%)</span>
              <span className="text-green-600 font-semibold">${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-neutral-200 pt-1 flex justify-between font-semibold text-sm">
            <span className="text-neutral-900">Total</span>
            <span className="text-neutral-900">${total.toFixed(2)}</span>
          </div>
          {quote.deposit_amount && quote.deposit_amount > 0 && (
            <div className="bg-neutral-50 rounded p-2 flex justify-between mt-1">
              <span className="font-semibold text-xs text-neutral-900">Deposit</span>
              <span className="font-bold text-sm text-green-600">${quote.deposit_amount.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Status & Deposit Section */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
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
