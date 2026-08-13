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

type ScheduleEvent = { id: string; type: 'quote' | 'job'; title: string; clientName: string; date: string; time: string | null }

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function weekStartFor(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  result.setDate(result.getDate() - result.getDay())
  return result
}

function shiftDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function eventTime(time: string | null) {
  if (!time) return 'Time not set'
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { companyId, loading: companyLoading } = useCompany()
  const [request, setRequest] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')
  const [scheduleNotes, setScheduleNotes] = useState('')
  const [scheduleService, setScheduleService] = useState('')
  const [calendarWeekStart, setCalendarWeekStart] = useState(() => weekStartFor(new Date()))
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!companyId || !showScheduleModal) return
      setCalendarLoading(true)
      const start = dateKey(calendarWeekStart)
      const end = dateKey(shiftDays(calendarWeekStart, 6))
      const [quotesResult, jobsResult] = await Promise.all([
        supabase.from('quotes').select('id, title, scheduled_date, scheduled_time, clients(name)')
          .eq('company_id', companyId).not('scheduled_date', 'is', null).gte('scheduled_date', start).lte('scheduled_date', end),
        supabase.from('jobs').select('id, title, date_scheduled, time_scheduled, clients(name)')
          .eq('company_id', companyId).neq('status', 'cancelled').gte('date_scheduled', `${start}T00:00:00`).lte('date_scheduled', `${end}T23:59:59`),
      ])
      if (cancelled) return
      const quoteEvents: ScheduleEvent[] = (quotesResult.data || []).map((item: any) => ({
        id: item.id, type: 'quote', title: item.title, clientName: item.clients?.name || 'Unknown client',
        date: item.scheduled_date, time: item.scheduled_time,
      }))
      const jobEvents: ScheduleEvent[] = (jobsResult.data || []).map((item: any) => {
        const [day, embeddedTime] = String(item.date_scheduled).split('T')
        return { id: item.id, type: 'job', title: item.title, clientName: item.clients?.name || 'Unknown client', date: day, time: item.time_scheduled || embeddedTime?.slice(0, 5) || null }
      })
      setScheduleEvents([...quoteEvents, ...jobEvents].sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`)))
      setCalendarLoading(false)
    })()
    return () => { cancelled = true }
  }, [companyId, showScheduleModal, calendarWeekStart])

  const handleScheduleQuote = () => {
    setScheduleService(request?.service_type || '')
    setShowScheduleModal(true)
  }

  const submitScheduleQuote = async () => {
    if (!request || !companyId || !scheduleDate || !scheduleTime) {
      alert('Please fill in all required fields')
      return
    }
    
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

      // Create quote with scheduled date/time
      const { error: quoteErr } = await supabase
        .from('quotes')
        .insert({
          company_id: companyId,
          client_id: clientId,
          title: scheduleService || 'Service Request',
          status: 'scheduled',
          amount: 0,
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          notes: scheduleNotes || null,
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

      // Close modal and go back
      setShowScheduleModal(false)
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

  const handleArchive = async () => {
    if (!request || !companyId) return

    const isArchived = request.status === 'archived'
    if (!isArchived && !window.confirm('Archive this request? You can restore it later from the Archived tab.')) return

    setProcessing(true)
    setArchiveError('')
    try {
      const nextStatus = isArchived ? 'pending' : 'archived'
      const { error } = await supabase
        .from('requests')
        .update({ status: nextStatus })
        .eq('id', request.id)
        .eq('company_id', companyId)

      if (error) throw error
      nav('/requests')
    } catch (err) {
      console.error('Request archive failed:', err)
      setArchiveError(isArchived ? 'Failed to restore request.' : 'Failed to archive request.')
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
            {request.status !== 'archived' && (
              <>
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
              </>
            )}
            <button
              onClick={handleArchive}
              disabled={processing}
              className="w-full py-3 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition disabled:opacity-50"
            >
              {processing ? 'Saving...' : request.status === 'archived' ? 'Restore Request' : 'Archive Request'}
            </button>
            {archiveError && <p className="text-sm text-red-600">{archiveError}</p>}
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
                request.status === 'archived' ? 'bg-neutral-200 text-neutral-700' :
                'bg-neutral-100 text-neutral-800'
              }`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Quote Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Schedule Quote Appointment</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-4">
              <section className="rounded-xl border border-neutral-200 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">Company schedule</h3>
                    <p className="text-xs text-neutral-500">Quotes are blue. Jobs are green. Tap a day to select it.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setCalendarWeekStart(weekStartFor(new Date()))} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-100">Today</button>
                    <button type="button" aria-label="Previous week" onClick={() => setCalendarWeekStart(value => shiftDays(value, -7))} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm hover:bg-neutral-100">←</button>
                    <button type="button" aria-label="Next week" onClick={() => setCalendarWeekStart(value => shiftDays(value, 7))} className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm hover:bg-neutral-100">→</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="grid min-w-[700px] grid-cols-7">
                    {Array.from({ length: 7 }, (_, index) => shiftDays(calendarWeekStart, index)).map(day => {
                      const dayKey = dateKey(day)
                      const events = scheduleEvents.filter(event => event.date === dayKey)
                      const selected = scheduleDate === dayKey
                      const today = dayKey === dateKey(new Date())
                      return (
                        <button type="button" key={dayKey} onClick={() => setScheduleDate(dayKey)} className={`min-h-40 border-r border-neutral-200 p-2 text-left last:border-r-0 transition ${selected ? 'bg-amber-50 ring-2 ring-inset ring-amber-500' : 'bg-white hover:bg-neutral-50'}`}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-neutral-500">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${today ? 'bg-neutral-900 text-white' : 'text-neutral-800'}`}>{day.getDate()}</span>
                          </div>
                          <div className="space-y-1.5">
                            {calendarLoading ? <span className="text-xs text-neutral-400">Loading…</span> : events.length === 0 ? <span className="text-xs text-neutral-400">Open</span> : events.map(event => (
                              <div key={`${event.type}-${event.id}`} className={`rounded-md border-l-4 px-2 py-1.5 ${event.type === 'quote' ? 'border-blue-500 bg-blue-50' : 'border-emerald-500 bg-emerald-50'}`}>
                                <div className="text-[11px] font-bold text-neutral-900">{eventTime(event.time)}</div>
                                <div className="truncate text-[11px] font-medium text-neutral-800">{event.title}</div>
                                <div className="truncate text-[10px] text-neutral-500">{event.clientName}</div>
                              </div>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Client</label>
                <input
                  type="text"
                  value={request?.client_name || ''}
                  disabled
                  className="w-full px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Service Type</label>
                <input
                  type="text"
                  value={scheduleService}
                  onChange={e => setScheduleService(e.target.value)}
                  placeholder="e.g., Kitchen Remodel, Deck Installation"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
                <textarea
                  value={scheduleNotes}
                  onChange={e => setScheduleNotes(e.target.value)}
                  placeholder="Any special instructions or details..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg font-medium hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submitScheduleQuote}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {processing ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
