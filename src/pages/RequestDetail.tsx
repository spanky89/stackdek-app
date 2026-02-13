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
  const [updating, setUpdating] = useState(false)

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

  const updateStatus = async (newStatus: string) => {
    if (!id) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('company_id', companyId)

      if (error) {
        console.error('Update error:', error)
        return
      }

      setRequest(prev => prev ? { ...prev, status: newStatus } : null)
    } finally {
      setUpdating(false)
    }
  }

  const deleteRequest = async () => {
    if (!id || !window.confirm('Delete this request?')) return

    try {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)

      if (error) {
        console.error('Delete error:', error)
        return
      }

      nav('/requests')
    } catch (err) {
      console.error('Delete failed:', err)
    }
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'contacted':
        return 'bg-blue-100 text-blue-800'
      case 'converted':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav(-1)} className="text-2xl text-neutral-700">←</button>
          <h1 className="text-2xl font-bold text-neutral-900">{request.client_name}</h1>
          <div className="flex-1" />
          <button onClick={deleteRequest} className="text-neutral-500 hover:text-red-600">🗑️</button>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-6">
          <div className="text-xs text-neutral-600 mb-2">Status</div>
          <div className="flex gap-2">
            {['pending', 'contacted', 'converted'].map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={updating}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  request.status === s
                    ? getStatusColor(s)
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Request Details */}
        <div className="space-y-4">
          {/* Client Name */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">Client Name</div>
            <p className="text-lg font-semibold text-neutral-900">{request.client_name}</p>
          </div>

          {/* Email */}
          {request.client_email && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 mb-1">Email</div>
              <a href={`mailto:${request.client_email}`} className="text-blue-600 hover:underline">
                {request.client_email}
              </a>
            </div>
          )}

          {/* Phone */}
          {request.client_phone && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 mb-1">Phone</div>
              <a href={`tel:${request.client_phone}`} className="text-blue-600 hover:underline">
                {request.client_phone}
              </a>
            </div>
          )}

          {/* Service Type */}
          {request.service_type && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 mb-1">Service Type</div>
              <p className="text-neutral-900">{request.service_type}</p>
            </div>
          )}

          {/* Description */}
          {request.description && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 mb-1">Description</div>
              <p className="text-neutral-900 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Requested Date */}
          {request.requested_date && (
            <div className="bg-white rounded-lg border border-neutral-200 p-4">
              <div className="text-xs text-neutral-600 mb-1">Requested Date</div>
              <p className="text-neutral-900">{formatDate(request.requested_date)}</p>
            </div>
          )}

          {/* Received Date */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">Received</div>
            <p className="text-neutral-900">{formatDate(request.created_at)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => nav('/requests')}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-neutral-900 font-medium hover:bg-neutral-50"
          >
            Back
          </button>
          <button
            onClick={() => nav('/quotes/create')} // Could auto-fill with request data
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800"
          >
            New Quote
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
