import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Job = {
  id: string; title: string; description: string | null; date_scheduled: string
  location: string | null; estimate_amount: number; status: string
  client_id: string | null; quote_id: string | null; completed_at: string | null
  clients: { id: string; name: string } | null
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
          .from('jobs').select('*, clients(id, name)').eq('id', id).single()
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
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{job.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status] || 'bg-neutral-100 text-neutral-800'}`}>{job.status.replace('_', ' ')}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">Quick Edit</button>
                  <button onClick={() => nav(`/job/${id}/edit`)} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Full Edit</button>
                </div>
              </div>
              {job.description && <p className="text-sm text-neutral-700 mb-4">{job.description}</p>}
              <div className="space-y-1 text-sm text-neutral-600">
                <p>Date: {new Date(job.date_scheduled).toLocaleString()}</p>
                <p>Location: {job.location || '—'}</p>
                <p>Estimate: ${job.estimate_amount}</p>
                {job.clients && <p>Client: <span className="text-blue-600 cursor-pointer" onClick={() => nav(`/client/${job.clients!.id}`)}>{job.clients.name}</span></p>}
                {job.completed_at && <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>}
              </div>
              
              <div className="mt-6 border-t border-neutral-200 pt-6">
                <label className="text-sm font-medium text-neutral-600 block mb-2">Job Completion</label>
                <div className="flex gap-2 flex-wrap">
                  <button 
                    onClick={() => changeStatus('completed')}
                    disabled={job.status === 'completed'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Mark Complete
                  </button>
                  <button 
                    onClick={openInvoiceModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Mark Complete & Generate Invoice
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-neutral-600 block mb-2">Change Status</label>
                <div className="flex gap-2">
                  {['scheduled', 'in_progress', 'completed'].map(s => (
                    <button key={s} onClick={() => changeStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${job.status === s ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200'}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                    </button>
                  ))}
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
