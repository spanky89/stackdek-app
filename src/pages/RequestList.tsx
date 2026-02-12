import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
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

export default function RequestListPage() {
  const nav = useNavigate()
  const { companyId, loading: companyLoading } = useCompany()
  const [requests, setRequests] = useState<Request[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadRequests = async () => {
      try {
        if (!companyId || companyLoading) return

        let query = supabase
          .from('requests')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (filter !== 'all') {
          query = query.eq('status', filter)
        }

        const { data, error } = await query
        if (error) console.error('Requests query error:', error)
        setRequests((data as any) || [])
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [filter, companyId, companyLoading])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-neutral-100 text-neutral-800'
      case 'scheduled':
        return 'bg-neutral-100 text-neutral-800'
      case 'converted':
        return 'bg-neutral-100 text-neutral-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  if (loading || companyLoading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading requests…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button className="text-2xl text-neutral-700">☰</button>
          <h1 className="text-2xl font-bold text-neutral-900">Requests</h1>
          <div className="flex-1" />
          <button className="text-neutral-500">🔍</button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'converted', label: 'Converted' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-600">
            <p className="text-sm">No requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-neutral-200 p-4 cursor-pointer hover:border-neutral-300 transition"
              >
                {/* Name & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">{request.client_name}</h3>
                    {request.service_type && (
                      <p className="text-sm text-neutral-600">{request.service_type}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ml-3 ${getStatusBadgeColor(
                      request.status
                    )}`}
                  >
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>

                {/* Contact Info */}
                <div className="text-sm text-neutral-600 space-y-1 mb-3">
                  {request.client_phone && (
                    <p>📱 {request.client_phone}</p>
                  )}
                  {request.client_email && (
                    <p>✉️ {request.client_email}</p>
                  )}
                </div>

                {/* Description */}
                {request.description && (
                  <p className="text-sm text-neutral-700 mb-3">{request.description}</p>
                )}

                {/* Date */}
                {request.requested_date && (
                  <div className="text-xs text-neutral-500">
                    Requested: {new Date(request.requested_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    </AppLayout>
  )
}
