import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { LineItemCard } from '../components/LineItemCard'
import { DocumentSummary } from '../components/DocumentSummary'
import { UnifiedLineItem } from '../types/lineItems'

type Job = {
  id: string; title: string; description: string | null; date_scheduled: string
  location: string | null; estimate_amount: number; status: string
  client_id: string | null; quote_id: string | null; completed_at: string | null
  notes: string | null
  clients: { id: string; name: string; email: string | null; phone: string | null; address: string | null } | null
}

type QuoteLineItem = {
  id: string; title?: string; description: string; quantity: number; unit_price: number; sort_order: number
}

type JobLineItem = UnifiedLineItem & {
  job_id: string
}

type InvoiceLineItem = {
  id: string; description: string; quantity: number; unit_price: number
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [jobLineItems, setJobLineItems] = useState<JobLineItem[]>([])
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', date_scheduled: '', time_scheduled: '', location: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showOriginalQuote, setShowOriginalQuote] = useState(false)
  const [activeTab, setActiveTab] = useState<'job' | 'notes'>('job')
  const [notes, setNotes] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState(false)
  
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
        setNotes((data as any).notes || '')
        const ds = data.date_scheduled || ''
        const [datePart, timePart] = ds.includes('T') ? ds.split('T') : [ds, '']
        setForm({
          title: data.title, description: data.description || '',
          date_scheduled: datePart, time_scheduled: timePart?.slice(0, 5) || '',
          location: data.location || '', status: data.status,
        })

        // Fetch job line items
        const { data: jobItems, error: jobItemsErr } = await supabase
          .from('job_line_items')
          .select('*')
          .eq('job_id', id)
          .order('sort_order')
        
        if (jobItemsErr) {
          console.error('Error fetching job line items:', jobItemsErr)
        } else if (jobItems && jobItems.length > 0) {
          setJobLineItems(jobItems)
        }

        // Fetch original quote line items if job was created from a quote
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

  // Calculate estimate from line items
  const calculateEstimateFromLineItems = (): number => {
    return jobLineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  // Auto-update estimate_amount when line items change
  useEffect(() => {
    if (jobLineItems.length > 0) {
      const newEstimate = calculateEstimateFromLineItems()
      if (job && job.estimate_amount !== newEstimate) {
        // Auto-save estimate to database
        supabase
          .from('jobs')
          .update({ estimate_amount: newEstimate })
          .eq('id', id)
          .then(({ error }) => {
            if (!error) {
              setJob({ ...job, estimate_amount: newEstimate })
            }
          })
      }
    }
  }, [jobLineItems])

  async function changeStatus(newStatus: string) {
    setBusy(true)
    const updateData: any = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error: upErr } = await supabase.from('jobs').update(updateData).eq('id', id)
    setBusy(false)
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
      status: form.status,
    }).eq('id', id)
    setSaving(false)
    if (upErr) { setError(upErr.message); return }
    setJob({ 
      ...job!, 
      title: form.title.trim(), 
      description: form.description.trim() || null, 
      date_scheduled: form.date_scheduled + (form.time_scheduled ? `T${form.time_scheduled}` : ''), 
      location: form.location.trim() || null, 
      status: form.status 
    })
    setEditing(false)
  }

  async function saveNotes() {
    setBusy(true)
    const { error: upErr } = await supabase
      .from('jobs')
      .update({ notes })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setJob({ ...job!, notes })
    setEditingNotes(false)
  }

  // Add new line item
  async function addLineItem() {
    const newItem: Partial<JobLineItem> = {
      job_id: id!,
      title: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      sort_order: jobLineItems.length,
    }

    const { data, error } = await supabase
      .from('job_line_items')
      .insert(newItem)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setJobLineItems([...jobLineItems, data])
  }

  // Update line item
  async function updateLineItem(updatedItem: UnifiedLineItem) {
    const { error } = await supabase
      .from('job_line_items')
      .update({
        title: updatedItem.title,
        description: updatedItem.description,
        quantity: updatedItem.quantity,
        unit_price: updatedItem.unit_price,
      })
      .eq('id', updatedItem.id)

    if (error) {
      setError(error.message)
      return
    }

    setJobLineItems(items =>
      items.map(item => item.id === updatedItem.id ? { ...item, ...updatedItem } : item)
    )
  }

  // Delete line item
  async function deleteLineItem(itemId: string) {
    const { error } = await supabase
      .from('job_line_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      setError(error.message)
      return
    }

    setJobLineItems(items => items.filter(item => item.id !== itemId))
  }

  // Move line item up
  async function moveLineItemUp(index: number) {
    if (index === 0) return
    const newItems = [...jobLineItems]
    ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
    
    // Update sort_order for both items
    await Promise.all([
      supabase.from('job_line_items').update({ sort_order: index - 1 }).eq('id', newItems[index - 1].id),
      supabase.from('job_line_items').update({ sort_order: index }).eq('id', newItems[index].id),
    ])

    setJobLineItems(newItems.map((item, idx) => ({ ...item, sort_order: idx })))
  }

  // Move line item down
  async function moveLineItemDown(index: number) {
    if (index === jobLineItems.length - 1) return
    const newItems = [...jobLineItems]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    
    // Update sort_order for both items
    await Promise.all([
      supabase.from('job_line_items').update({ sort_order: index }).eq('id', newItems[index].id),
      supabase.from('job_line_items').update({ sort_order: index + 1 }).eq('id', newItems[index + 1].id),
    ])

    setJobLineItems(newItems.map((item, idx) => ({ ...item, sort_order: idx })))
  }

  async function openInvoiceModal() {
    // Load job line items if they exist, otherwise fall back to quote items
    if (jobLineItems.length > 0) {
      // Pre-fill invoice with job line items
      setInvoiceLineItems(
        jobLineItems.map((item: JobLineItem) => ({
          id: crypto.randomUUID(),
          description: item.title || item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      )
    } else if (job?.quote_id && quoteLineItems.length > 0) {
      // Pre-fill invoice with quote line items
      setInvoiceLineItems(
        quoteLineItems.map((item: QuoteLineItem) => ({
          id: crypto.randomUUID(),
          description: item.title || item.description,
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

    setShowInvoiceModal(true)
  }

  function addInvoiceLineItem() {
    setInvoiceLineItems([
      ...invoiceLineItems,
      { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }
    ])
  }

  function updateInvoiceLineItem(id: string, field: keyof InvoiceLineItem, value: any) {
    setInvoiceLineItems(items =>
      items.map(item => item.id === id ? { ...item, [field]: value } : item)
    )
  }

  function removeInvoiceLineItem(id: string) {
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
          status: 'pending',
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
        {/* Back Button & Menu */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => nav('/jobs')} className="text-neutral-700 text-2xl leading-none">←</button>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium">
              Edit
            </button>
          </div>
        </div>

        {editing ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="space-y-3">
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" />
              <textarea className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.date_scheduled} onChange={e => setForm({ ...form, date_scheduled: e.target.value })} />
                <input type="time" className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.time_scheduled} onChange={e => setForm({ ...form, time_scheduled: e.target.value })} />
              </div>
              <input className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Location" />
              <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="bg-neutral-900 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
                <button onClick={() => setEditing(false)} className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Status Badge */}
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${statusColors[job.status] || 'bg-neutral-100 text-neutral-800'}`}>
                <span className="w-2 h-2 rounded-full bg-current"></span>
                {job.status.replace('_', ' ').charAt(0).toUpperCase() + job.status.replace('_', ' ').slice(1)}
              </span>
            </div>

            {/* Hero Header */}
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-neutral-900 mb-1">
                Job for {job.clients?.name || 'Client'} for ${(jobLineItems.length > 0 ? calculateEstimateFromLineItems() : job.estimate_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              <p className="text-neutral-600">{job.title}</p>
              {job.description && (
                <p className="text-sm text-neutral-500 mt-1">{job.description}</p>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
              <div>
                <span className="text-neutral-500 block mb-1">Scheduled</span>
                <p className="font-medium">
                  {new Date(job.date_scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              {job.completed_at && (
                <div>
                  <span className="text-neutral-500 block mb-1">Completed</span>
                  <p className="font-medium text-green-600">
                    {new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>

              {/* Client Info */}
              {job.clients && (
                <div className="mb-6">
                  <div className="mb-3">
                    <p className="font-medium text-neutral-900">{job.clients.name}</p>
                    {job.clients.phone && <p className="text-sm text-neutral-600">{job.clients.phone}</p>}
                    {job.clients.email && <p className="text-sm text-neutral-600">{job.clients.email}</p>}
                    {job.location && <p className="text-sm text-neutral-600 mt-1">{job.location}</p>}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    {job.clients.phone && (
                      <>
                        <a 
                          href={`tel:${job.clients.phone}`}
                          className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                        >
                          Call
                        </a>
                        <a 
                          href={`sms:${job.clients.phone}`}
                          className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                        >
                          Message
                        </a>
                      </>
                    )}
                    {job.location && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                      >
                        Navigate
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-neutral-200 mb-6">
                <button 
                  onClick={() => setActiveTab('job')}
                  className={`px-6 py-3 text-sm font-semibold ${activeTab === 'job' ? 'text-neutral-900 border-b-2 border-red-700' : 'text-neutral-500 font-medium'}`}
                >
                  Job
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-3 text-sm font-semibold ${activeTab === 'notes' ? 'text-neutral-900 border-b-2 border-red-700' : 'text-neutral-500 font-medium'}`}
                >
                  Notes
                </button>
              </div>

              {/* Job Tab Content */}
              {activeTab === 'job' && (
                <>
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

              {/* Line Items Section */}
              <div className="bg-white border-t border-b border-neutral-200 py-4 mb-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-neutral-900">Line items</h2>
                </div>
                
                {jobLineItems.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {jobLineItems.map((item, index) => (
                      <LineItemCard
                        key={item.id}
                        item={item}
                        mode="edit"
                        onUpdate={updateLineItem}
                        onDelete={() => deleteLineItem(item.id)}
                        onMoveUp={() => moveLineItemUp(index)}
                        onMoveDown={() => moveLineItemDown(index)}
                        isFirst={index === 0}
                        isLast={index === jobLineItems.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4 mb-4">No line items</p>
                )}

                <button
                  type="button"
                  onClick={addLineItem}
                  className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50 font-medium flex items-center justify-center gap-2"
                >
                  + Add Line Item
                </button>
              </div>

              {/* Financial Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-900 font-medium">Subtotal</span>
                  <span className="font-semibold text-neutral-900">
                    ${(jobLineItems.length > 0 ? calculateEstimateFromLineItems() : job.estimate_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-neutral-900 font-medium">Tax</span>
                  <span className="font-semibold text-neutral-900">$0.00 (0%)</span>
                </div>

                <div className="bg-neutral-50 -mx-4 px-4 py-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-neutral-900">Total</span>
                  <span className="text-lg font-bold text-neutral-900">
                    ${(jobLineItems.length > 0 ? calculateEstimateFromLineItems() : job.estimate_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Original Quote Reference (if exists) */}
              {quoteLineItems.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowOriginalQuote(!showOriginalQuote)}
                    className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors mb-3"
                  >
                    <svg 
                      className={`w-4 h-4 transition-transform ${showOriginalQuote ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium">View Original Quote</span>
                  </button>

                  {showOriginalQuote && (
                    <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-3">Quote Breakdown (Read-Only)</h4>
                      {quoteLineItems.map((item, idx) => (
                        <LineItemCard
                          key={item.id}
                          item={item}
                          mode="view"
                        />
                      ))}
                      <DocumentSummary
                        subtotal={quoteLineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)}
                        tax={0}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button 
                  onClick={() => changeStatus('scheduled')}
                  disabled={busy || job.status === 'scheduled'}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    job.status === 'scheduled'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  } disabled:opacity-40`}
                >
                  Scheduled
                </button>
                <button 
                  onClick={() => changeStatus('in_progress')}
                  disabled={busy || job.status === 'in_progress'}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    job.status === 'in_progress'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  } disabled:opacity-40`}
                >
                  In Progress
                </button>
                <button 
                  onClick={() => changeStatus('completed')}
                  disabled={busy || job.status === 'completed'}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    job.status === 'completed'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  } disabled:opacity-40`}
                >
                  Completed
                </button>
              </div>

              {/* Complete & Invoice Button */}
              <button 
                onClick={openInvoiceModal}
                className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 transition-colors"
              >
                Generate Invoice
              </button>
                </>
              )}

              {/* Notes Tab Content */}
              {activeTab === 'notes' && (
                <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-neutral-900">Notes</h2>
                    {!editingNotes ? (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setNotes(job?.notes || '')
                            setEditingNotes(false)
                          }}
                          className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded text-sm font-medium hover:bg-neutral-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveNotes}
                          disabled={busy}
                          className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingNotes ? (
                    <textarea
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      rows={8}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this job..."
                    />
                  ) : (
                    <div className="text-sm text-neutral-700 whitespace-pre-wrap min-h-[8rem]">
                      {notes || <span className="text-neutral-400 italic">No notes yet. Click Edit to add notes.</span>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

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
                              onChange={(e) => updateInvoiceLineItem(item.id, 'description', e.target.value)}
                              placeholder="Description"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="Qty"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateInvoiceLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              placeholder="Price"
                              className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm"
                            />
                          </div>
                          <div className="w-28 text-right pt-2 text-sm font-medium">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeInvoiceLineItem(item.id)}
                            className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                            disabled={invoiceLineItems.length === 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addInvoiceLineItem}
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
