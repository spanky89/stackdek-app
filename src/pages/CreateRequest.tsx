import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'

export default function CreateRequestPage() {
  const nav = useNavigate()
  const { companyId } = useCompany()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId')

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [description, setDescription] = useState('')
  const [requestedDate, setRequestedDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-populate from client if clientId provided
  useEffect(() => {
    if (clientId) {
      ;(async () => {
        try {
          const { data: client } = await supabase
            .from('clients')
            .select('id, name, email, phone')
            .eq('id', clientId)
            .single()
          
          if (client) {
            setClientName(client.name)
            setClientEmail(client.email || '')
            setClientPhone(client.phone || '')
          }
        } catch (e) {
          console.error('Failed to load client:', e)
        }
      })()
    }
  }, [clientId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientName.trim()) {
      setError('Client name is required')
      return
    }

    if (!serviceType.trim()) {
      setError('Service type is required')
      return
    }

    setBusy(true)
    try {
      if (!companyId) {
        setError('Company not found')
        return
      }

      // If client doesn't exist by email/phone, create one
      let finalClientId = clientId
      if (!finalClientId && (clientEmail || clientPhone)) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', companyId)
          .or(`email.eq.${clientEmail},phone.eq.${clientPhone}`)
          .single()

        if (existingClient) {
          finalClientId = existingClient.id
        }
      }

      // Create client if needed
      if (!finalClientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: clientName,
            email: clientEmail || null,
            phone: clientPhone || null,
          })
          .select('id')
          .single()

        if (clientErr) {
          setError('Failed to create client: ' + clientErr.message)
          return
        }

        finalClientId = newClient.id
      }

      // Create request
      const { error: err } = await supabase
        .from('requests')
        .insert({
          company_id: companyId,
          client_name: clientName,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          client_address: clientAddress || null,
          service_type: serviceType,
          description: description || null,
          requested_date: requestedDate || new Date().toISOString().split('T')[0],
          status: 'pending',
        })

      if (err) {
        setError(err.message || 'Failed to create request')
        return
      }

      nav('/requests')
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav('/requests')} className="text-neutral-700 text-2xl leading-none">←</button>
          <span className="font-semibold text-lg">New Request</span>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Client Name *</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="Client name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="client@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                value={clientAddress}
                onChange={e => setClientAddress(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Service Type *</label>
              <input
                type="text"
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="e.g., Landscaping, Plumbing, Roofing"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                rows={4}
                placeholder="Details about the request..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Requested Date</label>
              <input
                type="date"
                value={requestedDate}
                onChange={e => setRequestedDate(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {busy ? 'Creating…' : 'Create Request'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
