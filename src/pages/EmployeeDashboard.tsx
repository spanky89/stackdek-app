import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import EmployeeLayout from '../components/EmployeeLayout'

type Workspace = {
  member_id: string; full_name: string; email: string; role: string
  hourly_rate: number | null; company_name: string
  pay_period_frequency: 'weekly' | 'biweekly'; pay_period_start_date: string
}
type Job = { id: string; title: string; status: string; date_scheduled: string | null; location: string | null; client_name: string | null }
type Entry = { id: string; clock_in: string; clock_out: string | null; hours_worked: number | null; job_id: string | null; notes: string | null; activity_summary: string | null }

function payPeriod(anchor: string, frequency: 'weekly' | 'biweekly') {
  const startAnchor = new Date(`${anchor}T00:00:00`)
  const now = new Date()
  const days = frequency === 'biweekly' ? 14 : 7
  const elapsed = Math.floor((now.getTime() - startAnchor.getTime()) / 86400000)
  const start = new Date(startAnchor)
  start.setDate(start.getDate() + Math.floor(elapsed / days) * days)
  const end = new Date(start)
  end.setDate(end.getDate() + days - 1)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const fmtDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function EmployeeDashboard() {
  const nav = useNavigate()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [elapsed, setElapsed] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [showClockOut, setShowClockOut] = useState(false)
  const [summary, setSummary] = useState('')
  const [note, setNote] = useState('')
  const openEntry = entries.find(entry => !entry.clock_out) || null

  const period = useMemo(() => workspace ? payPeriod(workspace.pay_period_start_date, workspace.pay_period_frequency) : null, [workspace])
  const periodEntries = useMemo(() => period ? entries.filter(e => new Date(e.clock_in) >= period.start && new Date(e.clock_in) <= period.end) : [], [entries, period])
  const completedHours = periodEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0)
  const liveHours = openEntry ? Math.max(0, (Date.now() - new Date(openEntry.clock_in).getTime()) / 3600000) : 0
  const totalHours = completedHours + liveHours
  const estimatedPay = workspace?.hourly_rate == null ? null : totalHours * Number(workspace.hourly_rate)

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!openEntry) { setElapsed(''); return }
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(openEntry.clock_in).getTime()) / 1000))
      setElapsed(`${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [openEntry])

  async function load() {
    setLoading(true); setError('')
    try {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) { nav('/login'); return }
      const { data: workspaceData, error: workspaceError } = await supabase.rpc('get_my_employee_workspace')
      if (workspaceError) throw workspaceError
      const ws = (Array.isArray(workspaceData) ? workspaceData[0] : workspaceData) as Workspace | undefined
      if (!ws) { nav('/home'); return }
      setWorkspace(ws)
      const [{ data: jobData, error: jobError }, { data: timeData, error: timeError }] = await Promise.all([
        supabase.rpc('list_my_operational_jobs'),
        supabase.from('time_entries').select('id, clock_in, clock_out, hours_worked, job_id, notes, activity_summary').eq('team_member_id', ws.member_id).order('clock_in', { ascending: false }).limit(120),
      ])
      if (jobError) throw jobError
      if (timeError) throw timeError
      setJobs((jobData as Job[]) || [])
      setEntries((timeData as Entry[]) || [])
    } catch (err: any) { setError(err.message || 'Unable to load your workspace') }
    finally { setLoading(false) }
  }

  async function clockIn() {
    setWorking(true); setError('')
    const { error: clockError } = await supabase.rpc('clock_in_general', { p_job_id: null, p_notes: null })
    if (clockError) setError(clockError.message)
    else await load()
    setWorking(false)
  }

  async function clockOut() {
    setWorking(true); setError('')
    const { error: clockError } = await supabase.rpc('clock_out_current', {
      p_notes: note || null, p_activity_summary: summary || null,
    })
    if (clockError) setError(clockError.message)
    else { setShowClockOut(false); setSummary(''); setNote(''); await load() }
    setWorking(false)
  }

  if (loading) return <EmployeeLayout><div className="text-center py-20 text-neutral-500">Loading your day…</div></EmployeeLayout>

  return (
    <EmployeeLayout>
      <section className="mb-5">
        <h1 className="text-2xl font-bold">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {workspace?.full_name?.split(' ')[0]}</h1>
        <p className="text-sm text-neutral-500 mt-1 capitalize">{workspace?.role} · {workspace?.company_name}</p>
      </section>

      {error && <p className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</p>}

      <section className={`rounded-2xl p-6 mb-5 text-center border ${openEntry ? 'bg-green-50 border-green-200' : 'bg-white border-neutral-200'}`}>
        <p className="text-sm font-semibold text-neutral-600">{openEntry ? 'CLOCKED IN' : 'READY FOR WORK?'}</p>
        {openEntry && <p className="text-4xl font-bold text-green-800 my-4 tabular-nums">{elapsed}</p>}
        <button onClick={openEntry ? () => setShowClockOut(true) : clockIn} disabled={working}
          className={`w-full py-4 rounded-xl text-lg font-bold text-white disabled:opacity-50 ${openEntry ? 'bg-red-600' : 'bg-green-600'}`}>
          {working ? 'Saving…' : openEntry ? 'Clock Out' : 'Clock In'}
        </button>
        <p className="text-xs text-neutral-500 mt-3">Your shift records even when no job is selected.</p>
      </section>

      {period && <section id="history" className="bg-white border border-neutral-200 rounded-2xl p-5 mb-5 scroll-mt-6">
        <div className="flex justify-between items-start mb-4">
          <div><p className="font-semibold">Current pay period</p><p className="text-xs text-neutral-500">{fmtDate(period.start)} – {fmtDate(period.end)}</p></div>
          {openEntry && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">In progress</span>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-50 rounded-xl p-3"><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p><p className="text-xs text-neutral-500">Hours logged</p></div>
          <div className="bg-neutral-50 rounded-xl p-3"><p className="text-2xl font-bold">{estimatedPay == null ? '—' : `$${estimatedPay.toFixed(2)}`}</p><p className="text-xs text-neutral-500">Estimated gross pay</p></div>
        </div>
        {workspace?.hourly_rate != null && <p className="text-xs text-neutral-500 mt-3">${Number(workspace.hourly_rate).toFixed(2)}/hr · Before taxes and adjustments</p>}
        <div className="mt-4 divide-y divide-neutral-100">
          {periodEntries.filter(e => e.clock_out).map(e => <div key={e.id} className="py-3 flex justify-between text-sm"><span>{new Date(e.clock_in).toLocaleDateString()}</span><span className="font-semibold">{Number(e.hours_worked || 0).toFixed(2)}h</span></div>)}
          {!periodEntries.length && <p className="py-3 text-sm text-neutral-400">No time logged this period.</p>}
        </div>
      </section>}

      <section id="jobs" className="scroll-mt-6">
        <h2 className="font-semibold mb-3">My Jobs</h2>
        <div className="space-y-2">
          {jobs.map(job => <button key={job.id} onClick={() => nav(`/employee-job/${job.id}`)} className="w-full text-left bg-white border border-neutral-200 rounded-xl p-4">
            <div className="flex justify-between gap-3"><div><p className="font-semibold">{job.title}</p><p className="text-sm text-neutral-500">{job.client_name || job.location || 'Assigned job'}</p></div><span>→</span></div>
          </button>)}
          {!jobs.length && <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center text-sm text-neutral-400">No jobs assigned. You can still clock in normally.</div>}
        </div>
      </section>

      {showClockOut && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-end sm:items-center justify-center">
        <div className="bg-white rounded-2xl p-5 w-full max-w-md">
          <h2 className="text-xl font-bold">Wrap up your day</h2>
          <p className="text-sm text-neutral-500 mt-1 mb-4">A quick summary helps the office understand what got done.</p>
          <label className="text-sm font-medium">Tasks and activities</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} placeholder="Installed fence panels, picked up materials, cleaned the site…" className="w-full mt-1 mb-3 p-3 border border-neutral-200 rounded-xl" />
          <label className="text-sm font-medium">Optional note</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Anything the owner should know" className="w-full mt-1 p-3 border border-neutral-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-3 mt-5"><button onClick={() => setShowClockOut(false)} className="py-3 border rounded-xl font-semibold">Cancel</button><button onClick={clockOut} disabled={working} className="py-3 bg-red-600 text-white rounded-xl font-semibold">{working ? 'Saving…' : 'Clock Out'}</button></div>
        </div>
      </div>}
    </EmployeeLayout>
  )
}
