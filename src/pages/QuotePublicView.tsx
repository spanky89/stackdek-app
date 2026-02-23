import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Create anon-only client for public quote access (no session persistence)
const anonSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
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
  const [activeTab, setActiveTab] = useState<'quote' | 'notes'>('quote')

  // Check for payment success in URL
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      setPaymentSuccess(true)
    }
  }, [searchParams])

  useEffect(() => {
    ;(async () => {
      try {
        // Fetch quote without line items first
        const { data: quoteData, error: quoteErr } = await anonSupabase
          .from('quotes')
          .select(`
            id, title, status, amount, expiration_date, 
            deposit_amount, deposit_paid,
            clients(id, name, email), 
            companies(id, name, logo_url, invoice_notes)
          `)
          .eq('id', id)
          .single()
        
        if (quoteErr) { 
          setError(quoteErr.message)
          return 
        }

        // Fetch line items separately
        const { data: lineItems, error: lineErr } = await anonSupabase
          .from('quote_line_items')
          .select('id, description, quantity, unit_price')
          .eq('quote_id', id)

        if (lineErr) {
          console.warn('Warning: Could not fetch line items:', lineErr)
        }

        setQuote({ 
          ...(quoteData as any),
          quote_line_items: lineItems || []
        })
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
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

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
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Mobile Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 px-4 py-2 flex items-center gap-3 z-10">
        <button className="text-lg">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-neutral-500">Quote #{id.slice(0, 6)}</div>
          <h1 className="font-semibold text-sm text-neutral-900 truncate">{quote.clients?.name}</h1>
        </div>
        <div className="flex gap-2">
          <button className="text-lg">☎️</button>
          <button className="text-lg">⭐</button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Status & Amount */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-800">
              {quote.status === 'sent' ? '🟨 Awaiting Response' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </span>
          </div>
          <h2 className="text-xl font-bold mb-1">Quote #{id.slice(0, 6)} for {quote.clients?.name}</h2>
          <h3 className="text-base font-semibold text-neutral-600 mb-2">for ${quote.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-neutral-600">{quote.title}</p>
        </div>

        {/* Created & Viewed Dates */}
        <div className="grid grid-cols-2 gap-3 mb-4 bg-white rounded-lg p-3">
          <div>
            <p className="text-xs text-neutral-500 mb-1">Created</p>
            <p className="font-medium text-xs">Today</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 mb-1">Viewed</p>
            <p className="font-medium text-xs">Today</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 bg-green-600 text-white font-semibold py-2 text-sm rounded-lg hover:bg-green-700 transition">
            ✓ Approve
          </button>
          <button className="flex-1 bg-green-600 text-white font-semibold py-2 text-sm rounded-lg hover:bg-green-700 transition">
            ↻ Resend
          </button>
          <button className="bg-white border border-neutral-200 text-neutral-900 p-2 rounded-lg hover:bg-neutral-50 transition text-sm">
            ⋯
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('quote')}
            className={`py-2 font-semibold text-sm border-b-2 transition ${
              activeTab === 'quote'
                ? 'text-neutral-900 border-b-red-600'
                : 'text-neutral-600 border-b-transparent'
            }`}
          >
            Quote
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-2 font-semibold text-sm border-b-2 transition ${
              activeTab === 'notes'
                ? 'text-neutral-900 border-b-red-600'
                : 'text-neutral-600 border-b-transparent'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Quote Tab Content */}
        {activeTab === 'quote' && (
          <>
            {/* Line Items - Full Display */}
            {lineItems.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center text-xs text-neutral-500 mb-3">
                  <span className="font-semibold">Line items</span>
                  <button className="text-blue-600 font-semibold">+</button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg p-3 border border-neutral-200">
                      <p className="font-bold text-neutral-900 mb-1 text-sm">{item.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-neutral-600">{item.quantity} × ${item.unit_price.toFixed(2)}</span>
                        <span className="font-bold text-neutral-900">${(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-white rounded-lg p-3 space-y-2 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-neutral-200 pt-2 flex justify-between font-semibold text-sm">
                <span>Total</span>
                <span>${quote.amount.toFixed(2)}</span>
              </div>
              {quote.deposit_amount && (
                <div className="bg-neutral-50 rounded p-2 mt-2 flex justify-between text-sm">
                  <span className="font-semibold text-neutral-900">Required Deposit</span>
                  <span className="text-green-600 font-bold">${quote.deposit_amount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment Section */}
            {quote.deposit_amount && !quote.deposit_paid && !isExpired && (
              <div className="bg-white rounded-lg p-3 mb-3">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-red-700 text-xs">
                    {error}
                  </div>
                )}
                <button
                  onClick={handlePaymentClick}
                  disabled={processingPayment}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg py-2 font-semibold text-sm transition mb-2"
                >
                  {processingPayment ? 'Processing…' : '💳 Pay Deposit'}
                </button>
                <p className="text-xs text-neutral-500 text-center">Secure payment powered by Stripe</p>
              </div>
            )}

            {/* Status Messages */}
            {quote.deposit_paid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center mb-3">
                <p className="text-xs text-green-800 font-semibold">✓ Deposit paid!</p>
              </div>
            )}

            {isExpired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center mb-3">
                <p className="text-xs text-yellow-800 font-semibold">⚠ This quote has expired</p>
              </div>
            )}
          </>
        )}

        {/* Notes Tab Content */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg p-3">
            {quote.companies?.invoice_notes ? (
              <p className="text-xs text-neutral-700 whitespace-pre-wrap">{quote.companies.invoice_notes}</p>
            ) : (
              <p className="text-xs text-neutral-500">No notes added</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-neutral-500 py-2 border-t border-neutral-200 bg-white">
        Powered by StackDek
      </div>
    </div>
  )
}
