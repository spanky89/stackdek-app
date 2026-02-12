import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type LineItem = {
  id: string
  description: string
  quantity: number
  rate: number
}

type Quote = {
  id: string
  title: string
  status: string
  amount: number
  expiration_date: string | null
  deposit_amount: number | null
  deposit_paid: boolean
  clients: { id: string; name: string; email?: string } | null
  companies: { 
    id: string
    name: string 
    logo_url: string | null
    invoice_notes: string | null 
  } | null
  quote_line_items?: LineItem[]
}

export default function QuotePublicViewPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Check for payment success in URL
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setPaymentSuccess(true)
    }
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('quotes')
          .select(`
            id, title, status, amount, expiration_date, 
            deposit_amount, deposit_paid,
            clients(id, name, email), 
            companies(id, name, logo_url, invoice_notes),
            quote_line_items(id, description, quantity, rate)
          `)
          .eq('id', id)
          .single()
        
        if (fetchErr) { 
          setError(fetchErr.message)
          return 
        }
        setQuote(data as any)
      } catch (e: any) { 
        setError(e?.message ?? 'Unknown error') 
      }
      finally { 
        setLoading(false) 
      }
    })()
  }, [id])

  async function handlePaymentClick() {
    if (!quote?.deposit_amount || quote.deposit_amount <= 0) {
      setError('No deposit amount set for this quote')
      return
    }

    setProcessingPayment(true)
    setError(null)

    try {
      const response = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: id,
          depositAmount: quote.deposit_amount,
          clientEmail: quote.clients?.email || '',
          clientName: quote.clients?.name || '',
          companyId: quote.companies?.id,
          companyName: quote.companies?.name || 'StackDek Job',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-neutral-600">Loading quote…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p className="font-semibold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-neutral-600">Quote not found.</div>
      </div>
    )
  }

  const isExpired = quote.expiration_date && new Date(quote.expiration_date) < new Date()
  const lineItems = quote.quote_line_items || []
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0)

  // If payment was successful, show thank you page
  if (paymentSuccess && quote.deposit_paid) {
    return (
      <div className="min-h-screen bg-neutral-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Payment Received</h1>
              <p className="text-neutral-600">Thank you! We've received your deposit payment.</p>
            </div>

            <div className="bg-neutral-50 rounded-lg p-6 mb-6 text-left">
              <p className="text-sm text-neutral-600 mb-1">Quote</p>
              <p className="font-semibold mb-4">{quote.title}</p>
              
              <p className="text-sm text-neutral-600 mb-1">Deposit Paid</p>
              <p className="text-2xl font-bold text-green-600">${quote.deposit_amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            <p className="text-neutral-600 mb-6">
              The contractor will review your payment and start work soon. You'll receive updates and a receipt via email.
            </p>

            <div className="text-center text-xs text-neutral-500">
              <p>Powered by StackDek</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Logo */}
        {quote.companies?.logo_url && (
          <div className="mb-6 text-center">
            <img src={quote.companies.logo_url} alt={quote.companies.name} className="h-12 w-auto inline-block" />
          </div>
        )}

        {/* Quote Title & Amount */}
        <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{quote.title}</h1>
              <p className="text-neutral-600 text-sm">{quote.companies?.name || 'Service Provider'}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold mb-2">${quote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-neutral-200 pt-6">
            <div>
              <p className="text-neutral-600 mb-1">For</p>
              <p className="font-semibold">{quote.clients?.name || 'Client'}</p>
            </div>
            <div>
              <p className="text-neutral-600 mb-1">Valid Until</p>
              <p className="font-semibold">
                {quote.expiration_date 
                  ? new Date(quote.expiration_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : 'No expiration date'
                }
              </p>
              {isExpired && <p className="text-red-600 text-xs mt-1">❌ This quote has expired</p>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        {lineItems.length > 0 && (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
            <h2 className="text-sm font-semibold mb-4">Services</h2>
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm border-b border-neutral-100 pb-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-neutral-600 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-neutral-600 text-xs">${item.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center text-sm pt-3 font-semibold">
                <p>Subtotal</p>
                <p>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Section */}
        {quote.deposit_amount && !quote.deposit_paid && !isExpired && (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold mb-1">Deposit Required</h2>
                <p className="text-neutral-600 text-sm">To get started, please pay the deposit amount below.</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">${quote.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handlePaymentClick}
              disabled={processingPayment}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-3 font-semibold text-sm transition"
            >
              {processingPayment ? 'Processing…' : `Pay Deposit - $${quote.deposit_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </button>

            <p className="text-xs text-neutral-500 mt-4 text-center">
              Secure payment powered by Stripe
            </p>
          </div>
        )}

        {/* Terms & Conditions */}
        {quote.companies?.invoice_notes && (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
            <h2 className="text-sm font-semibold mb-3">Terms & Conditions</h2>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{quote.companies.invoice_notes}</p>
          </div>
        )}

        {/* Status Messages */}
        {quote.deposit_paid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <p className="text-sm text-green-800 font-semibold">✓ Deposit paid! Thank you</p>
            <p className="text-sm text-green-700 mt-1">The contractor will begin your job shortly.</p>
          </div>
        )}

        {isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-6">
            <p className="text-sm text-yellow-800 font-semibold">⚠ This quote has expired</p>
            <p className="text-sm text-yellow-700 mt-1">Please contact the contractor for an updated quote.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-neutral-500 mt-8">
          <p>Powered by StackDek</p>
        </div>
      </div>
    </div>
  )
}
