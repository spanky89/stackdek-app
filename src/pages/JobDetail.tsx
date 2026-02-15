import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Job = {
  id: string; title: string; description: string | null; date_scheduled: string
  location: string | null; estimate_amount: number; status: string
  client_id: string | null; quote_id: string | null; completed_at: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null
}

type QuoteLineItem = {
  id: string; description: string; quantity: number; unit_price: number
}

type InvoiceLineItem = {
  id: string; description: string; quantity: number; unit_price: number
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date_scheduled: '', time_scheduled: '', location: '', estimate_amount: '', status: '' })
  const [saving, setSaving] = useState(false)
  
  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([])
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [invoiceTaxRate, setInvoiceTaxRate] = useState(0)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('jobs').select('*, clients(id, name, email, phone, address)').eq('id', id).single()
        if (fetchErr) { setError(fetchErr.message); return }
        setJob(data as any)
        const ds = data.date_scheduled || ''
        const [datePart, timePart] = ds.includes('T') ? ds.split('T') : [ds, '']
        setForm({
          title: data.title, description: data.description || '',
          date_scheduled: datePart, time_scheduled: timePart?.slice(0, 5) || '',
          location: data.location || '', estimate_amount: String(data.estimate_amount || ''),
          status: data.status,
        })

        // Fetch quote line items if job was created from a quote
        if (data.quote_id) {
          const { data: items } = await supabase
            .from('quote_line_items')
            .select('*')
            .eq('quote_id', data.quote_id)
            .order('sort_order')
          if (items) setQuoteLineItems(items)
        }
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function changeStatus(newStatus: string) {
    const updateData: any = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error: upErr } = await supabase.from('jobs').update(updateData).eq('id', id)
    if (upErr) { setError(upErr.message); return }
    setJob({ ...job!, status: newStatus, completed_at: updateData.completed_at || job!.completed_at })
    setForm({ ...form, status: newStatus })
  }

  async function saveEdit() {
    if (!form.title.trim()) return
    setSaving(true)
    const { error: upErr } = await supabase.from('jobs').update({
      title: form.title.trim(), description: form.description.trim() || null,
      date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''),
      location: form.location.trim() || null,
      estimate_amount: form.estimate_amount ? parseFloat(form.estimate_amount) : 0,
      status: form.status,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    setJob({ ...job!, title: form.title.trim(), description: form.description.trim() || null, date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''), location: form.location.trim() || null, estimate_amount: parseFloat(form.estimate_amount) || 0, status: form.status })
    setEditing(false)
  }

  async function openInvoiceModal() {
    // Load quote line items if this job was created from a quote
    if (job?.quote_id) {
      const { data: quoteItems, error: qiErr } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', job.quote_id)
        .order('sort_order')

      if (!qiErr && quoteItems && quoteItems.length > 0) {
        // Pre-fill invoice with quote line items
        setInvoiceLineItems(
          quoteItems.map((item: QuoteLineItem) => ({
            id: crypto.randomUUID(),
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }))
        )
      } else {
        // Create default line item from job estimate
        setInvoiceLineItems([{
          id: crypto.randomUUID(),
          description: job?.title || 'Job Completion',
          quantity: 1,
          unit_price: job?.estimate_amount || 0,
        }])
      }
    } else {
      // Create default line item from job estimate
      setInvoiceLineItems([{
        id: crypto.randomUUID(),
        description: job?.title || 'Job Completion',
        quantity: 1,
        unit_price: job?.estimate_amount || 0,
      }])
    }

    setShowInvoiceModal(true)
  }

  function addLineItem() {
    setInvoiceLineItems([
      ...invoiceLineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
    ])
  }

  function updateLineItem(id: string, field: keyof InvoiceLineItem, value: any) {
    setInvoiceLineItems(items =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item)
    )
  }

  function removeLineItem(id: string) {
    setInvoiceLineItems(items => items.filter(item => item.id !== id))
  }

  function calculateSubtotal(): number {
    return invoiceLineItems.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price)
    }, 0)
  }

  function calculateTax(): number {
    return calculateSubtotal() * (invoiceTaxRate / 100)
  }

  function calculateTotal(): number {
    return calculateSubtotal() + calculateTax()
  }

  async function generateInvoice() {
    if (!job?.client_id) {
      setError('Job must have a client to generate invoice')
      return
    }

    if (invoiceLineItems.length === 0) {
      setError('Add at least one line item to the invoice')
      return
    }

    setGeneratingInvoice(true)
    try {
      // Get company_id from the job
      const { data: { user } } = await supabase.auth.getUser()
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user?.id)
        .single()

      if (!company) {
        setError('Company not found')
        return
      }

      const totalAmount = calculateTotal()

      // Create invoice
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          company_id: company.id,
          job_id: job.id,
          quote_id: job.quote_id,
          client_id: job.client_id,
          amount: totalAmount,
          total_amount: totalAmount,
          status: 'awaiting_payment',
          due_date: invoiceDueDate,
          notes: invoiceNotes || null,
          tax_rate: invoiceTaxRate || 0,
        })
        .select()
        .single()

      if (invErr) {
        setError(invErr.message)
        return
      }

      // Create invoice line items
      const lineItemsToInsert = invoiceLineItems.map((item, index) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sort_order: index,
      }))

      const { error: lineErr } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsToInsert)

      if (lineErr) {
        setError(lineErr.message)
        return
      }

      // Update job status to completed
      await supabase
        .from('jobs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)

      setShowInvoiceModal(false)
      setGeneratingInvoice(false)
      
      // Navigate to invoices list or show success message
      nav('/invoices')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to generate invoice')
      setGeneratingInvoice(false)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!job) return <div className="p-6">Job not found.</div>

  const statusColors: Record<string, string> = {
    scheduled: 'bg-neutral-100 text-neutral-800',
    in_progress: 'bg-neutral-100 text-neutral-800',
    completed: 'bg-neutral-100 text-neutral-800',
  }

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Job Detail</h1>
          <button onClick={() => nav('/jobs')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          {editing ? (
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" />
              <textarea className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.date_scheduled} onChange={e => setForm({ ...form, date_scheduled: e.target.value })} />
                <input type="time" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.time_scheduled} onChange={e => setForm({ ...form, time_scheduled: e.target.value })} />
              </div>
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.estimate_amount} onChange={e => setForm({ ...form, estimate_amount: e.target.value })} placeholder="Estimate" />
                <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="bg-neutral-900 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Header with Status Badge */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-neutral-900 mb-2">{job.title}</h2>
                    <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${statusColors[job.status] || 'bg-neutral-100 text-neutral-800'}`}>
                      {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => nav(`/job/${id}/edit`)} className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors">
                    Edit Job
                  </button>
                </div>
                {job.description && (
                  <p className="text-sm text-neutral-600 leading-relaxed">{job.description}</p>
                )}
              </div>

              {/* Client Contact Card */}
              {job.clients && (
                <div className="mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Client</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 mb-1">{job.clients.name}</p>
                      {job.clients.phone && <p className="text-sm text-neutral-600">{job.clients.phone}</p>}
                      {job.clients.email && <p className="text-sm text-neutral-600">{job.clients.email}</p>}
                    </div>
                    <div className="flex gap-2">
                      {job.clients.phone && (
                        <>
                          <a 
                            href={`tel:${job.clients.phone}`}
                            className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                            title="Call"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                          <a 
                            href={`sms:${job.clients.phone}`}
                            className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                            title="Message"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </a>
                        </>
                      )}
                      {job.location && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                          title="Navigate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Job Details Card */}
              <div className="mb-6 p-4 bg-white rounded-xl border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Job Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Scheduled</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {new Date(job.date_scheduled).toLocaleString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {job.location && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-neutral-600">Location</span>
                      <span className="text-sm font-medium text-neutral-900 text-right max-w-[60%]">{job.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-neutral-600">Estimate</span>
                    <span className="text-lg font-bold text-neutral-900">${job.estimate_amount?.toLocaleString() ?? '0'}</span>
                  </div>
                  {job.completed_at && (
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                      <span className="text-sm text-neutral-600">Completed</span>
                      <span className="text-sm font-medium text-green-600">
                        {new Date(job.completed_at).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Line Items Card */}
              {quoteLineItems.length > 0 && (
                <div className="mb-6 p-4 bg-white rounded-xl border border-neutral-200">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3">Quote Breakdown</h3>
                  <div className="space-y-3">
                    {quoteLineItems.map((item, idx) => (
                      <div key={item.id} className={`${idx !== 0 ? 'pt-3 border-t border-neutral-100' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium text-neutral-900">{item.description}</span>
                          <span className="text-sm font-bold text-neutral-900">
                            ${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-neutral-500">
                            Qty: {item.quantity} × ${item.unit_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t-2 border-neutral-200 flex justify-between items-center">
                      <span className="text-sm font-semibold text-neutral-700">Total</span>
                      <span className="text-lg font-bold text-neutral-900">
                        ${quoteLineItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Management Card */}
              <div className="mb-6 p-4 bg-white rounded-xl border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {['scheduled', 'in_progress', 'completed'].map(s => (
                    <button 
                      key={s} 
                      onClick={() => changeStatus(s)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        job.status === s 
                          ? 'bg-neutral-900 text-white' 
                          : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Completion Actions Card */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Complete Job</h3>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => changeStatus('completed')}
                    disabled={job.status === 'completed'}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-green-600"
                  >
                    Mark Complete
                  </button>
                  <button 
                    onClick={openInvoiceModal}
                    className="flex-1 min-w-[140px] px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Complete & Invoice
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Invoice Generation Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-neutral-200 sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Generate Invoice</h2>
                  <button 
                    onClick={() => setShowInvoiceModal(false)}
                    className="text-neutral-500 hover:text-neutral-700"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-neutral-600 mt-1">
                  Edit line items below and save to create an invoice
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {/* Line Items */}
                  <div>
                    <label className="text-sm font-medium text-neutral-700 block mb-2">
                      Invoice Line Items
                    </label>
                    <div className="space-y-3">
                      {invoiceLineItems.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Description"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="Qty"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-28 text-right pt-2 text-sm font-medium">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                            disabled={invoiceLineItems.length === 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addLineItem}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Line Item
                    </button>
                  </div>

                  {/* Client, Due Date, Tax, Notes */}
                  <div className="border-t border-neutral-200 pt-4 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 block mb-1">Client</label>
                      <input
                        type="text"
                        value={job?.clients?.name || 'Unknown Client'}
                        disabled
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-neutral-700 block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={invoiceDueDate}
                        onChange={(e) => setInvoiceDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700 block mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={invoiceTaxRate}
                        onChange={(e) => setInvoiceTaxRate(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700 block mb-1">Notes / Memo</label>
                      <textarea
                        value={invoiceNotes}
                        onChange={(e) => setInvoiceNotes(e.target.value)}
                        placeholder="Optional notes for this invoice"
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t border-neutral-200 pt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-600">Subtotal</span>
                      <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {invoiceTaxRate > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-600">Tax ({invoiceTaxRate}%)</span>
                        <span className="font-medium">${calculateTax().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                      <span className="text-lg font-semibold">Total</span>
                      <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-neutral-200 sticky bottom-0 bg-white flex gap-3">
                <button
                  onClick={generateInvoice}
                  disabled={generatingInvoice}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generatingInvoice ? 'Generating...' : 'Save Invoice'}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-white border border-neutral-200 rounded-lg"
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
