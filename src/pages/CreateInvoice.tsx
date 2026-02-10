import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Job = { id: string; title: string; estimate_amount: number; description: string | null; client_id: string | null; clients: { id: string; name: string } | null }
type LineItem = { description: string; quantity: number; unit_price: number }

export default function CreateInvoicePage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const jobId = searchParams.get('job_id')

  const [completedJobs, setCompletedJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState(jobId || '')
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        setCompanyId(company.id)
        const { data: jobs } = await supabase.from('jobs').select('id, title, estimate_amount, description, client_id, clients(id, name)').eq('company_id', company.id).eq('status', 'completed')
        setCompletedJobs((jobs as any) || [])

        // Pre-populate if job_id provided
        if (jobId) {
          const job = (jobs as any)?.find((j: Job) => j.id === jobId)
          if (job) populateFromJob(job)
        }
      } finally { setLoading(false) }
    })()
  }, [])

  function populateFromJob(job: Job) {
    setSelectedJobId(job.id)
    setClientId(job.client_id)
    setClientName(job.clients?.name || '')
    setLineItems([{ description: job.title + (job.description ? ` — ${job.description}` : ''), quantity: 1, unit_price: job.estimate_amount }])
  }

  function handleJobSelect(jid: string) {
    setSelectedJobId(jid)
    const job = completedJobs.find(j => j.id === jid)
    if (job) populateFromJob(job)
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems]
    updated[idx] = { ...updated[idx], [field]: value }
    setLineItems(updated)
  }

  function addLine() { setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0 }]) }
  function removeLine(idx: number) { if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== idx)) }

  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) return
    setError(null)
    setBusy(true)
    try {
      // Generate invoice number
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('company_id', companyId)
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, '0')}`

      const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        company_id: companyId,
        client_id: clientId,
        job_id: selectedJobId || null,
        invoice_number: invoiceNumber,
        total_amount: total,
        status: 'draft',
      }).select().single()

      if (invErr) { setError(invErr.message); return }

      // Insert line items
      const items = lineItems.filter(li => li.description.trim()).map((li, idx) => ({
        invoice_id: invoice.id,
        description: li.description.trim(),
        quantity: li.quantity,
        unit_price: li.unit_price,
        sort_order: idx,
      }))

      if (items.length > 0) {
        const { error: liErr } = await supabase.from('invoice_line_items').insert(items)
        if (liErr) { setError(liErr.message); return }
      }

      nav('/invoices')
    } catch (e: any) { setError(e?.message ?? 'Unknown error') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <button onClick={() => nav('/invoices')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <form onSubmit={onSubmit} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1 font-medium">From Completed Job</label>
            <select className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={selectedJobId} onChange={e => handleJobSelect(e.target.value)}>
              <option value="">— Select a job (optional) —</option>
              {completedJobs.map(j => <option key={j.id} value={j.id}>{j.title} — ${j.estimate_amount}</option>)}
            </select>
          </div>

          {clientName && <p className="text-sm text-neutral-600">Client: <strong>{clientName}</strong></p>}

          <div>
            <label className="block text-sm mb-2 font-medium">Line Items</label>
            <div className="space-y-3">
              {lineItems.map((li, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <input className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm" value={li.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" />
                  <input type="number" min="1" className="w-16 rounded-xl border border-neutral-200 px-2 py-2 text-sm text-center" value={li.quantity} onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)} />
                  <input type="number" step="0.01" min="0" className="w-24 rounded-xl border border-neutral-200 px-2 py-2 text-sm text-right" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Price" />
                  {lineItems.length > 1 && <button type="button" onClick={() => removeLine(idx)} className="text-red-500 text-sm px-2 py-2">✕</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 text-sm text-blue-600">+ Add line item</button>
          </div>

          <div className="text-right text-lg font-bold border-t border-neutral-200 pt-4">
            Total: ${total.toFixed(2)}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button className="w-full bg-neutral-900 text-white rounded-xl py-2 text-sm disabled:opacity-60" disabled={busy || lineItems.every(li => !li.description.trim())} type="submit">
            {busy ? 'Creating…' : 'Create Invoice (Draft)'}
          </button>
        </form>
      </>
    </AppLayout>
  )
}
