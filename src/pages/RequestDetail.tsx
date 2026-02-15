import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'

type Request = {
  id: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  service_type?: string
  description?: string
  requested_date?: string
  status: string
  created_at: string
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { companyId, loading: companyLoading } = useCompany()
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const loadRequest = async () => {
      try {
        if (!companyId || !id || companyLoading) return

        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('id', id)
          .eq('company_id', companyId)
          .single()

        if (error) {
          console.error('Request load error:', error)
          return
        }

        setRequest(data)
      } finally {
        setLoading(false)
      }
    }

    loadRequest()
  }, [id, companyId, companyLoading])

  const handleScheduleQuote = async () => {
    if (!request || !companyId) return
    
    setProcessing(true)
    try {
      // Create quote with scheduled status
      const { error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          client_name: request.client_name,
          client_email: request.client_email || null,
          client_phone: request.client_phone || null,
          client_address: request.client_address || null,
          service_type: request.service_type || 'General Service',
          description: request.description || '',
          status: 'scheduled',
          estimate_amount: 0,
          deposit_amount: 0,
        })

      if (quoteErr) {
        console.error('Quote creation error:', quoteErr)
        alert('Failed to schedule quote')
        return
      }

      // Mark request as converted
      await supabase
        .from('requests')
        .update({ status: 'converted' })
        .eq('id', request.id)

      // Go back to requests list
      nav('/requests')
    } catch (err) {
      console.error('Schedule quote failed:', err)
      alert('Failed to schedule quote')
    } finally {
      setProcessing(false)
    }
  }

  const handleCreateQuote = async () => {
    if (!request || !companyId) return
    
    setProcessing(true)
    try {
      // Find or create client
      let clientId = null

      // Try to find existing client by email or phone
      if (request.client_email || request.client_phone) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', companyId)
          .or(`email.eq.${request.client_email || ''},phone.eq.${request.client_phone || ''}`)
          .maybeSingle()

        if (existingClient) {
          clientId = existingClient.id
        }
      }

      // Create client if not found
      if (!clientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: request.client_name,
            email: request.client_email || null,
            phone: request.client_phone || null,
            address: request.client_address || null,
          })
          .select('id')
          .single()

        if (clientErr) {
          console.error('Client creation error:', clientErr)
          alert('Failed to create client')
          return
        }

        clientId = newClient.id
      }

      // Mark request as converted
      await supabase
        .from('requests')
        .update({ status: 'converted' })
        .eq('id', request.id)

      // Navigate to create quote with clientId and requestId
      nav(`/quotes/create?clientId=${clientId}&requestId=${request.id}`)
    } catch (err) {
      console.error('Create quote failed:', err)
      alert('Failed to create quote')
    } finally {
      setProcessing(false)
    }
  }

  const openDirections = () => {
    if (!request?.client_address) {
      alert('No address available')
      return
    }
    const encoded = encodeURIComponent(request.client_address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading || companyLoading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading…</div>
      </AppLayout>
    )
  }

  if (!request) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Request not found.</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => nav('/requests')} className="text-2xl text-neutral-700">←</button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-neutral-900">Request for {request.client_name}</h1>
            <p className="text-sm text-neutral-600 mt-1">Created {formatDate(request.created_at)}</p>
          </div>
          {request.client_phone && (
            <a
              href={`tel:${request.client_phone}`}
              className="p-2 text-2xl hover:bg-neutral-100 rounded-lg transition"
            >
              📞
            </a>
          )}
        </div>

        {/* Address & Directions */}
        {request.client_address && (
          <div className="mb-4">
            <p className="text-lg text-neutral-900 mb-3 whitespace-pre-wrap break-words">{request.client_address}</p>
            <button
              onClick={openDirections}
              className="w-full py-3 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-medium hover:bg-neutral-50 transition"
            >
              Directions
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleScheduleQuote}
            disabled={processing}
            className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            Schedule Quote
          </button>
          <button
            onClick={handleCreateQuote}
            disabled={processing}
            className="py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
          >
            Create Quote
          </button>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Request Details</h2>

          {/* Service Type */}
          {request.service_type && (
            <div>
              <div className="text-xs text-neutral-600 mb-1">Service Type</div>
              <p className="text-neutral-900">{request.service_type}</p>
            </div>
          )}

          {/* Description */}
          {request.description && (
            <div>
              <div className="text-xs text-neutral-600 mb-1">Description</div>
              <p className="text-neutral-900 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Email */}
          {request.client_email && (
            <div>
              <div className="text-xs text-neutral-600 mb-1">Email</div>
              <a href={`mailto:${request.client_email}`} className="text-blue-600 hover:underline">
                {request.client_email}
              </a>
            </div>
          )}

          {/* Phone */}
          {request.client_phone && (
            <div>
              <div className="text-xs text-neutral-600 mb-1">Phone</div>
              <a href={`tel:${request.client_phone}`} className="text-blue-600 hover:underline">
                {request.client_phone}
              </a>
            </div>
          )}

          {/* Requested Date */}
          {request.requested_date && (
            <div>
              <div className="text-xs text-neutral-600 mb-1">Requested Date</div>
              <p className="text-neutral-900">{formatDate(request.requested_date)}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <div className="text-xs text-neutral-600 mb-1">Status</div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              request.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
              request.status === 'converted' ? 'bg-green-100 text-green-800' :
              'bg-neutral-100 text-neutral-800'
            }`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
