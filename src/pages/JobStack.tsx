import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'

type Job = {
  id: string
  title: string
  status: string
  estimate_amount: number
  date_scheduled: string
  location: string
}

export default function JobStackPage() {
  const nav = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        if (company) {
          let query = supabase
            .from('jobs')
            .select('*')
            .eq('company_id', company.id)

          if (filter !== 'all') {
            query = query.eq('status', filter)
          }

          const { data } = await query

          setJobs(data || [])
        }
      } finally {
        setLoading(false)
      }
    }

    loadJobs()
  }, [filter])

  if (loading) {
    return <div className="p-6">Loading…</div>
  }

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Job Stack</h1>
          <button
            onClick={() => nav('/home')}
            className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg"
          >
            Home
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'scheduled', 'in_progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${
                filter === s
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center text-neutral-600">
            No jobs found.
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <div key={job.id} className="bg-white rounded-lg border border-neutral-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-neutral-600">{job.location}</p>
                  </div>
                  <span className="text-sm bg-neutral-100 px-2 py-1 rounded">
                    ${job.estimate_amount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <span>
                    {new Date(job.date_scheduled).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 bg-neutral-100 rounded text-xs font-medium">
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    </AppLayout>
  )
}
