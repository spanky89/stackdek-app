import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import { UnifiedLineItem } from '../types/lineItems'

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
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isPaid = invoice?.status === 'paid'

  useEffect(() => {
    loadInvoice()
  }, [token])

  async function loadInvoice() {
    try {
      // Fetch invoice by token (public access, no auth required)
      const { data: invoiceData, error: invErr } = await supabase
        .from('invoices')
        .select(`
          *,
          clients(id, name, email, phone, address),
          companies(id, name, email, phone, street_address, city, state, zip, logo_url)
        `)
        .eq('invoice_token', token)
        .single()

      if (invErr) {
        setError('Invoice not found')
        return
      }

      setInvoice(invoiceData as any)

      // Fetch line items
      const { data: itemsData, error: itemsErr } = await supabase
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
      {/* Print Button (hidden in print) */}
      <div className="max-w-4xl mx-auto mb-4 print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Invoice
        </button>
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

      {/* Footer note (hidden in print) */}
      <div className="max-w-4xl mx-auto mt-8 text-center text-sm text-neutral-500 print:hidden">
        <p>This is an official invoice from {invoice.companies?.name || 'this business'}.</p>
      </div>
    </div>
  )
}
