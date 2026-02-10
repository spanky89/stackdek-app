import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CreateJobForm from '../components/CreateJobForm'
import ListToolbar from '../components/ListToolbar'
import { useListFilter } from '../hooks/useListFilter'
import AppLayout from '../components/AppLayout'

type Job = {
  id: string; title: string; status: string; estimate_amount: number
  date_scheduled: string; clients: { name: string } | null
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

const SORT_OPTIONS = [
  { label: 'Date (newest)', fn: (a: Job, b: Job) => b.date_scheduled.localeCompare(a.date_scheduled) },
  { label: 'Date (oldest)', fn: (a: Job, b: Job) => a.date_scheduled.localeCompare(b.date_scheduled) },
  { label: 'Title A-Z', fn: (a: Job, b: Job) => a.title.localeCompare(b.title) },
  { label: 'Amount ↑', fn: (a: Job, b: Job) => a.estimate_amount - b.estimate_amount },
  { label: 'Amount ↓', fn: (a: Job, b: Job) => b.estimate_amount - a.estimate_amount },
]

export default function JobListPage() {
  const nav = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const list = useListFilter(jobs, {
    searchKeys: ['title', (j) => j.clients?.name ?? ''],
    filterKey: 'status',
    sortOptions: SORT_OPTIONS,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: company } = await supabase.from('companies').select('id').eq('owner_id', user.id).single()
        if (!company) return
        const { data } = await supabase.from('jobs').select('id, title, status, estimate_amount, date_scheduled, clients(name)').eq('company_id', company.id).order('date_scheduled', { ascending: false })
        setJobs((data as any) || [])
      } finally { setLoading(false) }
    })()
  }, [refreshKey])

  if (loading) return <div className="p-6">Loading…</div>

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg font-medium">+ New Job</button>
            <button onClick={() => nav('/home')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Home</button>
          </div>
        </div>

        <ListToolbar
          search={list.search} onSearch={list.setSearch}
          placeholder="Search jobs…"
          filters={FILTERS} activeFilter={list.filter} onFilter={list.setFilter}
          count={list.count} total={list.total}
          sortOptions={SORT_OPTIONS.map(s => ({ label: s.label }))}
          sortIdx={list.sortIdx} onSort={list.setSortIdx}
        />

        {list.filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            {jobs.length === 0 ? 'No jobs yet.' : 'No matching jobs.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-neutral-600 hidden sm:table-cell">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-neutral-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Estimate</th>
                </tr>
              </thead>
              <tbody>
                {list.filtered.map(j => (
                  <tr key={j.id} onClick={() => nav(`/job/${j.id}`)} className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium">{j.title}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{j.clients?.name || '—'}</td>
                    <td className="px-4 py-3 text-neutral-600 hidden sm:table-cell">{new Date(j.date_scheduled).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium">{j.status}</span></td>
                    <td className="px-4 py-3 text-right">${j.estimate_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">New Job</h2>
                <button onClick={() => setShowCreate(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
              </div>
              <CreateJobForm onSuccess={() => { setShowCreate(false); setLoading(true); setRefreshKey(k => k + 1) }} />
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}
