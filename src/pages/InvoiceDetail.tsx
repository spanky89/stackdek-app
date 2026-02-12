import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount: number
  tax_rate: number | null
  notes: string | null
  due_date: string | null
  created_at: string
  paid_date: string | null
  clients: { id: string; name: string; email: string | null } | null
  jobs: { id: string; title: string } | null
}

type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        // Fetch invoice
        const { data: invoiceData, error: invErr } = await supabase
          .from('invoices')
          .select('*, clients(id, name, email), jobs(id, title)')
          .eq('id', id)
          .single()

        if (invErr) {
          setError(invErr.message)
          return
        }

        setInvoice(invoiceData as any)

        // Fetch line items
        const { data: itemsData, error: itemsErr } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', id)
          .order('sort_order')

        if (itemsErr) {
          setError(itemsErr.message)
          return
        }

        setLineItems((itemsData as any) || [])
      } catch (e: any) {
        setError(e?.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function markAsPaid() {
    setMarking(true)
    try {
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString()
        })
        .eq('id', id)

      if (updateErr) {
        setError(updateErr.message)
        return
      }

      // Update local state
      setInvoice({
        ...invoice!,
        status: 'paid',
        paid_date: new Date().toISOString()
      })
    } catch (e: any) {
      setError(e?.message ?? 'Failed to mark as paid')
    } finally {
      setMarking(false)
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const calculateTax = () => {
    if (!invoice?.tax_rate) return 0
    return calculateSubtotal() * (invoice.tax_rate / 100)
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
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

  if (loading)
    return (
      <AppLayout>
        <div className="p-6">Loading...</div>
      </AppLayout>
    )

  if (error || !invoice)
    return (
      <AppLayout>
        <div className="p-6 text-red-600">{error || 'Invoice not found'}</div>
      </AppLayout>
    )

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Invoice Detail</h1>
          <button
            onClick={() => nav('/invoices')}
            className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Invoice #{invoice.invoice_number}</h2>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(invoice.status)}`}>
                {statusLabel(invoice.status)}
              </span>
            </div>
            <div className="text-right text-sm text-neutral-600">
              <p>Created: {new Date(invoice.created_at).toLocaleDateString()}</p>
              {invoice.due_date && (
                <p>Due: {new Date(invoice.due_date).toLocaleDateString()}</p>
              )}
              {invoice.paid_date && (
                <p className="text-green-600 font-medium">
                  Paid: {new Date(invoice.paid_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="mb-6 pb-6 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">Bill To</h3>
            <p className="font-medium">{invoice.clients?.name || 'Unknown Client'}</p>
            {invoice.clients?.email && (
              <p className="text-sm text-neutral-600">{invoice.clients.email}</p>
            )}
            {invoice.jobs && (
              <p className="text-sm text-neutral-600 mt-2">
                Related Job:{' '}
                <button
                  onClick={() => nav(`/job/${invoice.jobs!.id}`)}
                  className="text-blue-600 hover:underline"
                >
                  {invoice.jobs.title}
                </button>
              </p>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3">Items</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-neutral-600 pb-2 border-b border-neutral-200">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 text-sm">
                  <div className="col-span-6">{item.description}</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-2 text-right">${item.unit_price.toFixed(2)}</div>
                  <div className="col-span-2 text-right font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-neutral-200 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
            </div>
            {invoice.tax_rate && invoice.tax_rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tax ({invoice.tax_rate}%)</span>
                <span className="font-medium">${calculateTax().toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-neutral-200">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Notes</h3>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          {invoice.status !== 'paid' && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <button
                onClick={markAsPaid}
                disabled={marking}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {marking ? 'Marking as Paid...' : 'Mark as Paid'}
              </button>
            </div>
          )}
        </div>
      </>
    </AppLayout>
  )
}
