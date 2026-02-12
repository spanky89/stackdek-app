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
  clients: { id: string; name: string; email?: string } | null
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
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
          .from('quotes').select('id, title, status, amount, expiration_date, client_id, company_id, deposit_amount, deposit_paid, stripe_checkout_session_id, clients(id, name, email)').eq('id', id).single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
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
    if (!quote) return
    setBusy(true)
    setError(null)
    
    try {
      // 1. Mark deposit as paid
      const { error: upErr } = await supabase
        .from('quotes')
        .update({ 
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (upErr) throw new Error(`Failed to mark deposit paid: ${upErr.message}`)

      // 2. Create job from quote
      const jobData = {
        quote_id: quote.id,
        title: quote.title,
        client_id: quote.client_id,
        company_id: quote.company_id,
        status: 'pending',
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
      
      // Show success and navigate
      alert(`✓ Deposit marked as paid. Job created!`)
      nav('/jobs')
    } catch (err: any) {
      console.error('Offline payment error:', err)
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

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quote Detail</h1>
          <button onClick={() => nav('/quotes')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">{quote.title}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>{quote.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => nav(`/quote/${id}/edit`)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">Edit</button>
              <p className="text-2xl font-bold">${quote.amount.toLocaleString()}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-neutral-600 mb-6">
            {quote.clients && <p>Client: <span className="text-blue-600 cursor-pointer" onClick={() => nav(`/client/${quote.clients!.id}`)}>{quote.clients.name}</span></p>}
            <p>Expiration: {quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString() : 'None'}</p>
          </div>

          {/* Deposit Payment Section */}
          <div className="border-t border-neutral-200 pt-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Deposit Payment</h3>
              {!checkingStripe && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600">Stripe:</span>
                  {stripeConnected ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                      ✓ Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => nav('/settings')}
                      className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium hover:bg-yellow-200 transition"
                    >
                      ⚠ Setup Required
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {!stripeConnected && !checkingStripe && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Stripe not configured.</strong> Configure your Stripe keys in{' '}
                  <button 
                    onClick={() => nav('/settings')}
                    className="font-semibold hover:underline"
                  >
                    Settings → Payment Settings
                  </button>{' '}
                  to accept payments.
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Deposit Amount Input */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-neutral-600 mb-1">Deposit Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                    disabled={quote.deposit_paid}
                  />
                </div>
                <button
                  onClick={saveDepositAmount}
                  disabled={busy || quote.deposit_paid || !depositAmount}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save Amount
                </button>
              </div>

              {/* Deposit Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">Status:</span>
                {quote.deposit_paid ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                    ✓ Deposit Paid
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">
                    Pending Payment
                  </span>
                )}
              </div>

              {/* Payment Actions */}
              {!quote.deposit_paid && quote.deposit_amount && quote.deposit_amount > 0 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleStripePayment}
                    disabled={processingPayment || !stripeConnected}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!stripeConnected ? 'Configure Stripe in Settings first' : ''}
                  >
                    {processingPayment ? 'Processing...' : '💳 Pay Deposit with Stripe'}
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm cursor-pointer hover:bg-neutral-200">
                    <input
                      type="checkbox"
                      checked={quote.deposit_paid}
                      onChange={markOfflinePayment}
                      disabled={busy}
                      className="w-4 h-4"
                    />
                    <span>Offline payment received</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => updateStatus('accepted')} disabled={busy || quote.status === 'accepted'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-40">Accept Quote</button>
            <button onClick={() => updateStatus('declined')} disabled={busy || quote.status === 'declined'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-40">Decline Quote</button>
            <button onClick={() => updateStatus('expired')} disabled={busy || quote.status === 'expired'}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm disabled:opacity-40">Mark Expired</button>
          </div>

          {/* Share Quote Section */}
          <div className="border-t border-neutral-200 pt-6">
            <h3 className="text-sm font-semibold mb-3">Share Quote</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={`${window.location.origin}/quotes/view/${id}`}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 bg-neutral-50"
              />
              <button 
                onClick={copyShareableLink}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Share this link with your client to view the quote</p>
          </div>
        </div>
      </>
    </AppLayout>
  )
}
