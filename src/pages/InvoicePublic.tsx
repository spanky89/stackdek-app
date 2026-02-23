import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { UnifiedLineItem } from '../types/lineItems'

// Create anon-only client for public invoice access (no session persistence)
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

// Log client creation for debugging
console.log('Anon Supabase client created:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  tax_rate: number | null
  tax_amount: number | null
  deposit_paid_amount: number | null
  notes: string | null
  due_date: string | null
  created_at: string
  paid_date: string | null
  clients: { 
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
  companies: {
    id: string
    name: string
    email: string | null
    phone: string | null
    street_address: string | null
    city: string | null
    state: string | null
    zip: string | null
    logo_url: string | null
  } | null
}

export default function InvoicePublicPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancelled' | null>(null)

  const isPaid = invoice?.status === 'paid'

  useEffect(() => {
    loadInvoice()

    // Check for payment status in URL
    const payment = searchParams.get('payment')
    if (payment === 'success') {
      setPaymentStatus('success')
      // Clear the query param after showing message
      setTimeout(() => {
        setSearchParams({})
      }, 100)
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled')
      setTimeout(() => {
        setSearchParams({})
      }, 100)
    }
  }, [token, searchParams])

  async function loadInvoice() {
    try {
      console.log('Loading invoice with token:', token)
      
      // Fetch invoice first (without joins to avoid nested RLS issues)
      const { data: invoiceData, error: invErr } = await anonSupabase
        .from('invoices')
        .select('*')
        .eq('invoice_token', token)
        .single()

      console.log('Invoice query result:', { data: invoiceData, error: invErr })

      if (invErr) {
        console.error('Invoice load error:', invErr)
        setError(invErr.message || 'Invoice not found')
        return
      }

      // Fetch client data separately
      let clientData = null
      if (invoiceData.client_id) {
        const { data: client } = await anonSupabase
          .from('clients')
          .select('id, name, email, phone, address')
          .eq('id', invoiceData.client_id)
          .single()
        clientData = client
      }

      // Fetch company data separately
      let companyData = null
      if (invoiceData.company_id) {
        const { data: company } = await anonSupabase
          .from('companies')
          .select('id, name, email, phone, street_address, city, state, zip, logo_url')
          .eq('id', invoiceData.company_id)
          .single()
        companyData = company
      }

      // Combine the data
      setInvoice({
        ...invoiceData,
        clients: clientData,
        companies: companyData
      } as any)

      // Fetch line items
      const { data: itemsData, error: itemsErr } = await anonSupabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceData.id)
        .order('sort_order')

      if (itemsErr) {
        setError(itemsErr.message)
        return
      }

      setLineItems((itemsData as any) || [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const calculateTax = () => {
    if (invoice?.tax_amount != null) return invoice.tax_amount
    if (!invoice?.tax_rate) return 0
    return calculateSubtotal() * (invoice.tax_rate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - (invoice?.deposit_paid_amount || 0)
  }

  function handlePrint() {
    window.print()
  }

  async function handlePayNow() {
    if (!token) return;

    setProcessingPayment(true);
    setError(null);

    try {
      const response = await fetch('/api/create-invoice-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      setProcessingPayment(false);
    }
  }

  const statusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'paid') return 'bg-green-600 text-white'
    if (s === 'awaiting_payment' || s === 'sent') return 'bg-yellow-500 text-white'
    if (s === 'pending' || s === 'draft') return 'bg-neutral-300 text-neutral-800'
    if (s === 'overdue' || s === 'past_due') return 'bg-red-600 text-white'
    return 'bg-neutral-200 text-neutral-800'
  }

  const statusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'draft') return 'Draft'
    if (s === 'awaiting_payment') return 'Awaiting Payment'
    if (s === 'overdue' || s === 'past_due') return 'Past Due'
    return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-lg text-neutral-600">Loading invoice...</div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Invoice Not Found</h1>
          <p className="text-neutral-600">{error || 'This invoice link may be invalid or expired.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 print:bg-white print:py-0">
      {/* Action Buttons (hidden in print) */}
      <div className="max-w-4xl mx-auto mb-4 print:hidden">
        <div className="flex gap-3">
          {!isPaid && calculateTotal() > 0 && (
            <button
              onClick={handlePayNow}
              disabled={processingPayment}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg"
            >
              {processingPayment ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay Now - ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </>
              )}
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        {paymentStatus === 'success' && (
          <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold">Payment Successful!</p>
                <p className="text-sm">Your payment has been received. Thank you!</p>
              </div>
            </div>
          </div>
        )}
        {paymentStatus === 'cancelled' && (
          <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-semibold">Payment Cancelled</p>
                <p className="text-sm">No charges were made. You can try again when ready.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none relative">
        {/* Paid Watermark */}
        {isPaid && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 print:opacity-20">
            <div className="text-9xl font-black text-green-600 rotate-[-30deg]">PAID</div>
          </div>
        )}

        <div className="p-12 print:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-neutral-200">
            <div>
              {invoice.companies?.logo_url && (
                <img
                  src={invoice.companies.logo_url}
                  alt="Business Logo"
                  className="h-16 mb-4 object-contain"
                />
              )}
              <h1 className="text-3xl font-bold text-neutral-900">
                {invoice.companies?.name || 'Business Name'}
              </h1>
              {(invoice.companies?.street_address || invoice.companies?.city) && (
                <p className="text-sm text-neutral-600 mt-2">
                  {invoice.companies.street_address && <>{invoice.companies.street_address}<br /></>}
                  {(invoice.companies.city || invoice.companies.state || invoice.companies.zip) && (
                    <>{invoice.companies.city}{invoice.companies.state && `, ${invoice.companies.state}`} {invoice.companies.zip}</>
                  )}
                </p>
              )}
              {invoice.companies?.phone && (
                <p className="text-sm text-neutral-600">{invoice.companies.phone}</p>
              )}
              {invoice.companies?.email && (
                <p className="text-sm text-neutral-600">{invoice.companies.email}</p>
              )}
              {invoice.companies?.tax_id && (
                <p className="text-sm text-neutral-600 mt-2">Tax ID: {invoice.companies.tax_id}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-neutral-900 mb-2">INVOICE</h2>
              <p className="text-lg font-semibold text-neutral-700">#{invoice.invoice_number}</p>
              <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${statusColor(invoice.status)}`}>
                {statusLabel(invoice.status)}
              </span>
            </div>
          </div>

          {/* Invoice Info & Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <h3 className="text-sm font-bold text-neutral-700 mb-3 uppercase tracking-wider">Bill To</h3>
              <p className="font-semibold text-lg text-neutral-900">{invoice.clients?.name || 'Client Name'}</p>
              {invoice.clients?.address && (
                <p className="text-sm text-neutral-600 mt-1 whitespace-pre-line">{invoice.clients.address}</p>
              )}
              {invoice.clients?.phone && (
                <p className="text-sm text-neutral-600 mt-1">{invoice.clients.phone}</p>
              )}
              {invoice.clients?.email && (
                <p className="text-sm text-neutral-600">{invoice.clients.email}</p>
              )}
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-neutral-600">Invoice Date:</span>
                  <span className="text-sm font-semibold text-neutral-900">
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-neutral-600">Due Date:</span>
                    <span className="text-sm font-semibold text-neutral-900">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {invoice.paid_date && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-green-600">Paid Date:</span>
                    <span className="text-sm font-semibold text-green-700">
                      {new Date(invoice.paid_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-100 border-b-2 border-neutral-300">
                  <th className="text-left py-3 px-4 text-sm font-bold text-neutral-700 uppercase tracking-wider">Item</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-neutral-700 uppercase tracking-wider">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-neutral-700 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-bold text-neutral-700 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-neutral-200">
                    <td className="py-4 px-4">
                      {item.title && <div className="font-semibold text-neutral-900">{item.title}</div>}
                      {item.description && <div className="text-sm text-neutral-600">{item.description}</div>}
                    </td>
                    <td className="text-right py-4 px-4 text-neutral-900">{item.quantity}</td>
                    <td className="text-right py-4 px-4 text-neutral-900">
                      ${item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-4 px-4 font-semibold text-neutral-900">
                      ${(item.quantity * item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="space-y-2 border-t-2 border-neutral-300 pt-4">
                <div className="flex justify-between text-neutral-700">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold">
                    ${calculateSubtotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {calculateTax() > 0 && (
                  <div className="flex justify-between text-neutral-700">
                    <span className="font-medium">
                      Tax {invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}:
                    </span>
                    <span className="font-semibold">
                      ${calculateTax().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {invoice.deposit_paid_amount && invoice.deposit_paid_amount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span className="font-medium">Deposit Paid:</span>
                    <span className="font-semibold">
                      -${invoice.deposit_paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-neutral-900 pt-3 border-t-2 border-neutral-300">
                  <span>Total Due:</span>
                  <span>${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="text-sm font-bold text-neutral-700 mb-2 uppercase tracking-wider">Notes</h3>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-neutral-200 text-center text-sm text-neutral-500">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>

      {/* Pay Now Button - Bottom (hidden in print) */}
      {!isPaid && calculateTotal() > 0 && (
        <div className="max-w-4xl mx-auto mt-6 print:hidden">
          <button
            onClick={handlePayNow}
            disabled={processingPayment}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl shadow-xl"
          >
            {processingPayment ? (
              <>
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Payment...
              </>
            ) : (
              <>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay ${calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })} Now
              </>
            )}
          </button>
        </div>
      )}

      {/* Footer note (hidden in print) */}
      <div className="max-w-4xl mx-auto mt-8 text-center text-sm text-neutral-500 print:hidden">
        <p>This is an official invoice from {invoice.companies?.name || 'this business'}.</p>
        {!isPaid && <p className="mt-2 font-medium text-neutral-600">Secure payment powered by Stripe</p>}
      </div>
    </div>
  )
}
