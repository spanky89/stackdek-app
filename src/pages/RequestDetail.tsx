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
  client_city?: string
  client_state?: string
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
      // Build full address from parts
      const fullAddress = [
        request.client_address,
        request.client_city,
        request.client_state
      ].filter(Boolean).join(', ')

      // Create quote with scheduled status
      const { error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          client_name: request.client_name,
          client_email: request.client_email || null,
          client_phone: request.client_phone || null,
          client_address: fullAddress || null,
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
        // Build full address from parts
        const fullAddress = [
          request.client_address,
          request.client_city,
          request.client_state
        ].filter(Boolean).join(', ')

        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: request.client_name,
            email: request.client_email || null,
            phone: request.client_phone || null,
            address: fullAddress || null,
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
    if (!request?.client_address && !request?.client_city) {
      alert('No address available')
      return
    }
    const fullAddress = [
      request.client_address,
      request.client_city,
      request.client_state
    ].filter(Boolean).join(', ')
    const encoded = encodeURIComponent(fullAddress)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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

  const fullAddress = [
    request.client_address,
    [request.client_city, request.client_state].filter(Boolean).join(', ')
  ].filter(Boolean).join('\n')

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => nav('/requests')} className="text-2xl text-neutral-700">←</button>
            <h1 className="text-xl font-semibold text-neutral-900">Request Profile</h1>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          {/* Client Name & Date */}
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">{request.client_name}</h2>
          <p className="text-neutral-600 mb-6">Request received {formatDate(request.created_at)}</p>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {request.client_phone && (
              <a
                href={`tel:${request.client_phone}`}
                className="py-3 bg-neutral-900 text-white rounded-lg font-medium text-center hover:bg-neutral-800 transition"
              >
                Call
              </a>
            )}
            {request.client_email && (
              <a
                href={`mailto:${request.client_email}`}
                className="py-3 bg-neutral-900 text-white rounded-lg font-medium text-center hover:bg-neutral-800 transition"
              >
                Message
              </a>
            )}
            {(request.client_address || request.client_city) && (
              <button
                onClick={openDirections}
                className="py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition"
              >
                Navigate
              </button>
            )}
          </div>

          {/* Quote Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleScheduleQuote}
              disabled={processing}
              className="w-full py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              Schedule Quote
            </button>
            <button
              onClick={handleCreateQuote}
              disabled={processing}
              className="w-full py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              Create Quote
            </button>
          </div>

          {/* Details Section */}
          <div className="border-t border-neutral-200 pt-6 space-y-4">
            {/* Email */}
            {request.client_email && (
              <div className="flex justify-between items-start">
                <span className="text-neutral-600">Email</span>
                <a href={`mailto:${request.client_email}`} className="text-neutral-900 font-medium text-right">
                  {request.client_email}
                </a>
              </div>
            )}

            {/* Phone */}
            {request.client_phone && (
              <div className="flex justify-between items-start">
                <span className="text-neutral-600">Phone</span>
                <a href={`tel:${request.client_phone}`} className="text-neutral-900 font-medium text-right">
                  {request.client_phone}
                </a>
              </div>
            )}

            {/* Address */}
            {fullAddress && (
              <div className="flex justify-between items-start">
                <span className="text-neutral-600">Address</span>
                <p className="text-neutral-900 font-medium text-right whitespace-pre-line">{fullAddress}</p>
              </div>
            )}

            {/* Description */}
            {request.description && (
              <div className="flex justify-between items-start">
                <span className="text-neutral-600">Description</span>
                <p className="text-neutral-900 font-medium text-right max-w-xs whitespace-pre-wrap">{request.description}</p>
              </div>
            )}

            {/* Requested Date */}
            {request.requested_date && (
              <div className="flex justify-between items-start">
                <span className="text-neutral-600">Requested Date</span>
                <span className="text-neutral-900 font-medium">
                  {new Date(request.requested_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}

            {/* Status */}
            <div className="flex justify-between items-start">
              <span className="text-neutral-600">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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
      </div>
    </AppLayout>
  )
}
