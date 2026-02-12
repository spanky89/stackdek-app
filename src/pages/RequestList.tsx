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
  const [newCount, setNewCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

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

        // Load counts for stats
        const [newRes, pendingRes] = await Promise.all([
          supabase
            .from('requests')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'pending'),
          supabase
            .from('requests')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'pending'),
        ])

        setNewCount(newRes.count || 0)
        setPendingCount(pendingRes.count || 0)
      } finally {
        setLoading(false)
      }
    }

    loadRequests()
  }, [filter, companyId, companyLoading])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-xs font-medium text-neutral-700">Pending</span>
      case 'contacted':
        return <span className="text-xs font-medium text-neutral-700">Contacted</span>
      case 'converted':
        return <span className="text-xs font-medium text-neutral-700">Converted</span>
      default:
        return <span className="text-xs font-medium text-neutral-700">New</span>
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.toLocaleDateString('en-US', { month: 'short' })
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month} ${day}, ${year}`
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
        <div className="flex items-center gap-3 mb-6">
          <button className="text-2xl text-neutral-700">☰</button>
          <h1 className="text-2xl font-bold text-neutral-900">Requests</h1>
          <div className="flex-1" />
          <button className="text-neutral-500">➕</button>
          <button className="text-neutral-500">🔍</button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">New Requests</div>
            <div className="text-3xl font-bold text-neutral-900">{newCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4">
            <div className="text-xs text-neutral-600 mb-1">Pending</div>
            <div className="text-3xl font-bold text-neutral-900">{pendingCount}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All Requests' },
            { key: 'pending', label: 'New' },
            { key: 'contacted', label: 'Pending' },
            { key: 'converted', label: 'Contacted' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
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
          <div className="space-y-3">
            {requests.map(request => (
              <div
                key={request.id}
                onClick={() => nav(`/request/${request.id}`)}
                className="bg-white rounded-lg border border-neutral-200 p-4 cursor-pointer hover:border-neutral-300 transition flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  {/* Name & Date */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-neutral-900">{request.client_name}</h3>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">
                    Received: {formatDate(request.created_at)}
                  </p>

                  {/* Description */}
                  {request.description && (
                    <p className="text-sm text-neutral-700 mb-3 line-clamp-2">
                      {request.description}
                    </p>
                  )}

                  {/* Phone & Distance */}
                  {request.client_phone && (
                    <div className="flex items-center gap-3 text-sm text-neutral-600">
                      <span>📱 {request.client_phone}</span>
                      {/* Placeholder for distance - can be added later */}
                    </div>
                  )}
                </div>

                {/* Status Badge & Arrow */}
                <div className="flex flex-col items-end gap-3 flex-shrink-0">
                  {getStatusBadge(request.status)}
                  <span className="text-neutral-400">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    </AppLayout>
  )
}
