import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useCompany } from '../context/CompanyContext'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Client = {
  id: string
  name: string
  created_at: string
}

type Job = {
  id: string
  title: string
  status: string
  estimate_amount: number
  date_scheduled: string
  location: string
  time_scheduled?: string
  client_id?: string
  created_at?: string
  sort_order?: number
  client?: Client
}

function SortableJobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-neutral-100 text-neutral-800'
      case 'in_progress':
        return 'bg-neutral-100 text-neutral-800'
      case 'completed':
        return 'bg-neutral-100 text-neutral-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer hover:border-neutral-300 transition flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing pt-1 text-neutral-400 hover:text-neutral-600 transition"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
          </svg>
        </div>

        {/* Card Content */}
        <div className="flex-1" onClick={onClick}>
          {/* Title & Price */}
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-neutral-900">{job.title}</h3>
            <span className="text-base font-semibold text-neutral-900 ml-3 whitespace-nowrap">
              ${job.estimate_amount?.toLocaleString() ?? '0'}
            </span>
          </div>

          {/* Address */}
          <p className="text-sm text-neutral-500 mb-3">{job.location}</p>

          {/* Date & Time */}
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
              </svg>
              <span>{formatDate(job.date_scheduled)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{formatTime(job.time_scheduled)}</span>
            </div>
          </div>

          {/* Client Info & Status */}
          {job.client && (
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-900">{job.client.name}</p>
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ml-3 ${getStatusBadgeColor(
                  job.status
                )}`}
              >
                {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StaticJobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getStatusBadgeColor = (status: string) => {
    return 'bg-neutral-100 text-neutral-800'
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer hover:border-neutral-300 transition"
    >
      {/* Title & Price */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-lg text-neutral-900">{job.title}</h3>
        <span className="text-base font-semibold text-neutral-900 ml-3 whitespace-nowrap">
          ${job.estimate_amount?.toLocaleString() ?? '0'}
        </span>
      </div>

      {/* Address */}
      <p className="text-sm text-neutral-500 mb-3">{job.location}</p>

      {/* Date & Time */}
      <div className="flex items-center justify-between text-sm text-neutral-600 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
          </svg>
          <span>{formatDate(job.date_scheduled)}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{formatTime(job.time_scheduled)}</span>
        </div>
      </div>

      {/* Client Info & Status */}
      {job.client && (
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-900">{job.client.name}</p>
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap ml-3 ${getStatusBadgeColor(
              job.status
            )}`}
          >
            {job.status === 'in_progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function JobStackPage() {
  const nav = useNavigate()
  const { companyId, loading: companyLoading } = useCompany()
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [inProgressJobs, setInProgressJobs] = useState<Job[]>([])
  const [scheduledJobs, setScheduledJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [estimatedHours, setEstimatedHours] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags on click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [filter, companyId, companyLoading])

  const loadData = async () => {
    try {
      if (!companyId || companyLoading) {
        console.log('Waiting for company...', { companyId, companyLoading })
        return
      }

      const now = new Date()
      const next30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      // Load jobs with client data, ordered by in_progress first, then sort_order
      let query = supabase
        .from('jobs')
        .select('*, client:clients(id, name, created_at)')
        .eq('company_id', companyId)

      if (filter === 'all') {
        // Exclude completed jobs from "All Jobs" view
        query = query.neq('status', 'completed')
      } else {
        query = query.eq('status', filter)
      }

      const { data: jobsData, error: jobsError } = await query
      if (jobsError) console.error('Jobs query error:', jobsError)

      const jobs = (jobsData as any) || []
      setAllJobs(jobs)

      // Split into in_progress and scheduled
      const inProgress = jobs.filter((j: Job) => j.status === 'in_progress')
      const scheduled = jobs
        .filter((j: Job) => j.status === 'scheduled')
        .sort((a: Job, b: Job) => {
          // Sort by sort_order (nulls last), then by created_at
          if (a.sort_order == null && b.sort_order == null) {
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          }
          if (a.sort_order == null) return 1
          if (b.sort_order == null) return -1
          return a.sort_order - b.sort_order
        })

      setInProgressJobs(inProgress)
      setScheduledJobs(scheduled)

      // Load stats
      const [revenueRes, upcomingRes, hoursRes] = await Promise.all([
        // Total revenue from paid invoices
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', companyId)
          .eq('status', 'paid'),
        // Upcoming jobs count
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('date_scheduled', now.toISOString().split('T')[0])
          .lte('date_scheduled', next30days),
        // Estimated hours (assume 8h per job estimate)
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .neq('status', 'completed'),
      ])

      const revenue = (revenueRes.data || []).reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0)
      setTotalRevenue(revenue)
      setUpcomingCount(upcomingRes.count || 0)
      setEstimatedHours(Math.ceil((upcomingRes.count || 0) * 8))
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = scheduledJobs.findIndex((job) => job.id === active.id)
    const newIndex = scheduledJobs.findIndex((job) => job.id === over.id)

    // Optimistic UI update
    const reorderedJobs = arrayMove(scheduledJobs, oldIndex, newIndex)
    setScheduledJobs(reorderedJobs)

    // Update sort_order in database
    try {
      const updates = reorderedJobs.map((job, index) => ({
        id: job.id,
        sort_order: index + 1,
      }))

      for (const update of updates) {
        await supabase
          .from('jobs')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
      }

      console.log('✅ Job order saved')
    } catch (error) {
      console.error('❌ Failed to save job order:', error)
      // Reload on error
      loadData()
    }
  }

  if (loading || companyLoading) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-neutral-600">Loading jobs…</div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Job Stack</h1>
          <div className="flex gap-2">
            <button onClick={() => nav('/job/create')} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-medium">+ New Job</button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All Jobs' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">
              ${(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-neutral-600 mt-1">Revenue</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">{upcomingCount}</div>
            <div className="text-xs text-neutral-600 mt-1">Upcoming Jobs</div>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
            <div className="text-2xl font-bold text-neutral-900">{estimatedHours}d</div>
            <div className="text-xs text-neutral-600 mt-1">Est. Time</div>
          </div>
        </div>

        {/* Job Cards */}
        {filter === 'all' || filter === 'scheduled' || filter === 'in_progress' ? (
          <div className="space-y-8">
            {/* In Progress Section */}
            {inProgressJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  In Progress
                </h2>
                <div className="space-y-3">
                  {inProgressJobs.map((job) => (
                    <StaticJobCard key={job.id} job={job} onClick={() => nav(`/job/${job.id}`)} />
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled Section (Sortable) */}
            {scheduledJobs.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                  Scheduled
                </h2>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={scheduledJobs.map((j) => j.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {scheduledJobs.map((job) => (
                        <SortableJobCard key={job.id} job={job} onClick={() => nav(`/job/${job.id}`)} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {inProgressJobs.length === 0 && scheduledJobs.length === 0 && (
              <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-600">
                <p className="text-sm">No jobs found in this category.</p>
              </div>
            )}
          </div>
        ) : (
          // Completed jobs (no drag, just list)
          <div className="space-y-4">
            {allJobs.length === 0 ? (
              <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center text-neutral-600">
                <p className="text-sm">No jobs found in this category.</p>
              </div>
            ) : (
              allJobs.map((job) => (
                <StaticJobCard key={job.id} job={job} onClick={() => nav(`/job/${job.id}`)} />
              ))
            )}
          </div>
        )}
      </>
    </AppLayout>
  )
}
