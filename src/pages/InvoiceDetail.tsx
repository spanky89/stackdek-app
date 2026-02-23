import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { LineItemCard } from '../components/LineItemCard'
import { DocumentSummary } from '../components/DocumentSummary'
import { UnifiedLineItem } from '../types/lineItems'
import SendInvoiceModal from '../components/SendInvoiceModal'

type Invoice = {
  id: string
  invoice_number: string
  status: string
  total_amount: number
  amount: number
  tax_rate: number | null
  tax_amount: number | null
  deposit_paid_amount: number | null
  notes: string | null
  due_date: string | null
  created_at: string
  paid_date: string | null
  invoice_token: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null } | null
  jobs: { id: string; title: string } | null
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sendingStripeInvoice, setSendingStripeInvoice] = useState(false)

  const isPaid = invoice?.status === 'paid'

  useEffect(() => {
    loadInvoice()
  }, [id])

  useEffect(() => {
    // Auto-open send modal if ?send=true
    const shouldSend = searchParams.get('send')
    if (shouldSend === 'true' && invoice) {
      setShowSendModal(true)
      // Clean up URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('send')
      nav(`/invoice/${id}?${newParams.toString()}`, { replace: true })
    }
  }, [searchParams, invoice, id, nav])

  async function loadInvoice() {
    try {
      // Fetch invoice
      const { data: invoiceData, error: invErr } = await supabase
        .from('invoices')
        .select('*, clients(id, name, email, phone), jobs(id, title)')
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
  }

  async function handleUpdateItem(updated: UnifiedLineItem) {
    const { error: updateErr } = await supabase
      .from('invoice_line_items')
      .update({
        title: updated.title,
        description: updated.description,
        quantity: updated.quantity,
        unit_price: updated.unit_price,
      })
      .eq('id', updated.id)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    // Update local state
    setLineItems(lineItems.map(item => item.id === updated.id ? updated : item))
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Delete this line item?')) return

    const { error: deleteErr } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', itemId)

    if (deleteErr) {
      setError(deleteErr.message)
      return
    }

    // Update local state
    setLineItems(lineItems.filter(item => item.id !== itemId))
  }

  async function handleMoveItem(itemId: string, direction: 'up' | 'down') {
    const currentIndex = lineItems.findIndex(item => item.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= lineItems.length) return

    const reordered = [...lineItems]
    const [movedItem] = reordered.splice(currentIndex, 1)
    reordered.splice(newIndex, 0, movedItem)

    // Update sort_order for all items
    const updates = reordered.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }))

    // Batch update
    for (const update of updates) {
      await supabase
        .from('invoice_line_items')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }

    // Update local state
    setLineItems(reordered.map((item, index) => ({ ...item, sort_order: index })))
  }

  async function handleAddItem() {
    setSaving(true)
    try {
      const newItem = {
        invoice_id: id,
        title: '',
        description: 'New item',
        quantity: 1,
        unit_price: 0,
        sort_order: lineItems.length,
      }

      const { data, error: insertErr } = await supabase
        .from('invoice_line_items')
        .insert(newItem)
        .select()
        .single()

      if (insertErr) {
        setError(insertErr.message)
        return
      }

      setLineItems([...lineItems, data as any])
    } finally {
      setSaving(false)
    }
  }

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

  async function sendStripeInvoice() {
    if (!invoice) return

    setSendingStripeInvoice(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/create-stripe-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send Stripe invoice')
      }

      // Reload invoice to show updated status
      await loadInvoice()

      alert('✅ Stripe invoice sent successfully! Client will receive an email with payment link.')
    } catch (err: any) {
      setError(err.message || 'Failed to send Stripe invoice')
      alert(`❌ Error: ${err.message || 'Failed to send Stripe invoice'}`)
    } finally {
      setSendingStripeInvoice(false)
    }
  }

  async function deleteInvoice() {
    setDeleting(true)
    try {
      // First delete line items
      const { error: lineItemsErr } = await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', id)

      if (lineItemsErr) {
        setError(lineItemsErr.message)
        setDeleting(false)
        return
      }

      // Then delete invoice
      const { error: invoiceErr } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (invoiceErr) {
        setError(invoiceErr.message)
        setDeleting(false)
        return
      }

      // Navigate back to invoices list
      nav('/invoices')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete invoice')
      setDeleting(false)
    }
  }

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  const calculateTax = () => {
    // Use tax_amount if set, otherwise calculate from tax_rate
    if (invoice?.tax_amount != null) return invoice.tax_amount
    if (!invoice?.tax_rate) return 0
    return calculateSubtotal() * (invoice.tax_rate / 100)
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-700">Items</h3>
              {!isPaid && (
                <button
                  onClick={handleAddItem}
                  disabled={saving}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {saving ? 'Adding...' : '+ Add Item'}
                </button>
              )}
            </div>
            
            {lineItems.length === 0 ? (
              <p className="text-sm text-neutral-500 italic">No line items</p>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <LineItemCard
                    key={item.id}
                    item={item}
                    mode={isPaid ? 'view' : 'edit'}
                    onUpdate={handleUpdateItem}
                    onDelete={() => handleDeleteItem(item.id)}
                    onMoveUp={() => handleMoveItem(item.id, 'up')}
                    onMoveDown={() => handleMoveItem(item.id, 'down')}
                    isFirst={index === 0}
                    isLast={index === lineItems.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Document Summary */}
          <DocumentSummary
            subtotal={calculateSubtotal()}
            tax={calculateTax()}
            depositPaid={invoice.deposit_paid_amount || 0}
            showDepositPaid={true}
          />

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-700 mb-2">Notes</h3>
              <p className="text-sm text-neutral-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-neutral-200 space-y-3">
            {!isPaid && (
              <>
                <button
                  onClick={() => setShowSendModal(true)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Invoice
                </button>
                <button
                  onClick={sendStripeInvoice}
                  disabled={sendingStripeInvoice}
                  className="w-full px-4 py-2 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5147e5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                  </svg>
                  {sendingStripeInvoice ? 'Sending...' : 'Request Payment via Stripe'}
                </button>
                <button
                  onClick={markAsPaid}
                  disabled={marking}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {marking ? 'Marking as Paid...' : 'Mark as Paid'}
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Invoice
            </button>
          </div>
        </div>

        {/* Send Invoice Modal */}
        {showSendModal && invoice && (
          <SendInvoiceModal
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            clientName={invoice.clients?.name || 'Unknown Client'}
            clientEmail={invoice.clients?.email || null}
            clientPhone={invoice.clients?.phone || null}
            jobTitle={invoice.jobs?.title || null}
            totalAmount={calculateSubtotal() + calculateTax() - (invoice.deposit_paid_amount || 0)}
            invoiceToken={invoice.invoice_token}
            onClose={() => setShowSendModal(false)}
            onSent={() => {
              // Optionally reload invoice or show success
              loadInvoice()
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-2">Delete Invoice?</h2>
              <p className="text-neutral-600 mb-6">
                Are you sure you want to delete invoice #{invoice?.invoice_number}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={deleteInvoice}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}
