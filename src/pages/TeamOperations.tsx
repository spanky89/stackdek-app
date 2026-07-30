import { useEffect, useMemo, useState } from 'react'
import AppLayout from '../components/AppLayout'
import TeamManagement from './TeamManagement'
import { supabase } from '../api/supabaseClient'
import { useCompany } from '../context/CompanyContext'
import { companyDateKey, companyDateTimeInput, companyInputToUtc, DEFAULT_TIME_ZONE, formatCompanyDate, formatCompanyTime, formatDateKey, payPeriodDateKeys, TIME_ZONE_LABELS } from '../utils/companyTime'
import { useAccess } from '../context/AccessContext'

type Tab = 'overview' | 'timesheets' | 'team' | 'labor'
type Member = {
  id: string
  full_name: string
  email: string
  role: string
  hourly_rate: number | null
  is_active: boolean
}
type Job = { id: string; title: string }
type Entry = {
  id: string
  team_member_id: string
  job_id: string | null
  clock_in: string
  clock_out: string | null
  hours_worked: number | null
  labor_cost: number | null
  activity_summary: string | null
  notes: string | null
  approval_status?: 'pending' | 'approved'
  corrected_at?: string | null
}
type Correction = {
  entry: Entry
  clockIn: string
  clockOut: string
  jobId: string
  reason: string
}

const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const hours = (value: number) => `${value.toFixed(2)}h`
export default function TeamOperations() {
  const { companyId } = useCompany()
  const { role } = useAccess()
  const isOwner = !role
  const [tab, setTab] = useState<Tab>('overview')
  const [members, setMembers] = useState<Member[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly'>('weekly')
  const [anchor, setAnchor] = useState('2026-01-04')
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')
  const [correction, setCorrection] = useState<Correction | null>(null)

  useEffect(() => { if (companyId) void load() }, [companyId])

  async function load() {
    if (!companyId) return
    setLoading(true)
    setError('')
    try {
      const [companyResult, memberResult, jobResult, entryResult] = await Promise.all([
        supabase.from('companies').select('pay_period_frequency, pay_period_start_date, time_zone').eq('id', companyId).single(),
        supabase.from('team_members').select('id, full_name, email, role, hourly_rate, is_active').eq('company_id', companyId).order('full_name'),
        supabase.from('jobs').select('id, title').eq('company_id', companyId).order('title'),
        supabase.from('time_entries').select('id, team_member_id, job_id, clock_in, clock_out, hours_worked, labor_cost, activity_summary, notes, approval_status, corrected_at').eq('company_id', companyId).order('clock_in', { ascending: false }).limit(500),
      ])
      for (const result of [companyResult, memberResult, jobResult, entryResult]) {
        if (result.error) throw result.error
      }
      setMembers((memberResult.data as Member[]) || [])
      setJobs((jobResult.data as Job[]) || [])
      setEntries((entryResult.data as Entry[]) || [])
      if (companyResult.data?.pay_period_frequency) setFrequency(companyResult.data.pay_period_frequency)
      if (companyResult.data?.pay_period_start_date) setAnchor(companyResult.data.pay_period_start_date)
      if (companyResult.data?.time_zone) setTimeZone(companyResult.data.time_zone)
    } catch (err: any) {
      setError(err.message || 'Unable to load team operations')
    } finally {
      setLoading(false)
    }
  }

  const period = useMemo(() => payPeriodDateKeys(anchor, frequency, timeZone), [anchor, frequency, timeZone])
  const periodEntries = useMemo(
    () => entries.filter(entry => {
      const date = companyDateKey(entry.clock_in, timeZone)
      return date >= period.start && date <= period.end
    }),
    [entries, period, timeZone],
  )
  const completed = periodEntries.filter(entry => entry.clock_out)
  const open = entries.filter(entry => !entry.clock_out)
  const totalHours = completed.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0)
  const totalLabor = completed.reduce((sum, entry) => sum + Number(entry.labor_cost || 0), 0)
  const pending = completed.filter(entry => entry.approval_status !== 'approved')
  const memberById = new Map(members.map(member => [member.id, member]))
  const jobById = new Map(jobs.map(job => [job.id, job]))
  const fmtPeriod = `${formatDateKey(period.start)} – ${formatDateKey(period.end)}`

  const memberTotals = members.map(member => {
    const memberEntries = completed.filter(entry => entry.team_member_id === member.id)
    return {
      member,
      entries: memberEntries,
      hours: memberEntries.reduce((sum, entry) => sum + Number(entry.hours_worked || 0), 0),
      pay: memberEntries.reduce((sum, entry) => sum + Number(entry.labor_cost || 0), 0),
      pending: memberEntries.filter(entry => entry.approval_status !== 'approved').length,
    }
  })

  const laborGroups = new Map<string, { label: string; hours: number; cost: number; entries: number }>()
  for (const entry of completed) {
    const key = entry.job_id || 'general'
    const existing = laborGroups.get(key) || {
      label: entry.job_id ? jobById.get(entry.job_id)?.title || 'Unknown job' : 'General / Unallocated',
      hours: 0, cost: 0, entries: 0,
    }
    existing.hours += Number(entry.hours_worked || 0)
    existing.cost += Number(entry.labor_cost || 0)
    existing.entries += 1
    laborGroups.set(key, existing)
  }

  async function approve(entry: Entry, approved: boolean) {
    setWorking(entry.id)
    setError('')
    const { error: approvalError } = await supabase.rpc('set_time_entry_approval', {
      p_entry_id: entry.id,
      p_approved: approved,
    })
    if (approvalError) setError(approvalError.message)
    else await load()
    setWorking('')
  }

  function edit(entry: Entry) {
    setCorrection({
      entry,
      clockIn: companyDateTimeInput(entry.clock_in, timeZone),
      clockOut: entry.clock_out ? companyDateTimeInput(entry.clock_out, timeZone) : '',
      jobId: entry.job_id || '',
      reason: '',
    })
  }

  async function saveCorrection() {
    if (!correction?.clockIn || !correction.clockOut) return
    setWorking(correction.entry.id)
    setError('')
    const { error: correctionError } = await supabase.rpc('correct_team_time_entry', {
      p_entry_id: correction.entry.id,
      p_clock_in: companyInputToUtc(correction.clockIn, timeZone),
      p_clock_out: companyInputToUtc(correction.clockOut, timeZone),
      p_job_id: correction.jobId || null,
      p_reason: correction.reason || null,
    })
    if (correctionError) setError(correctionError.message)
    else { setCorrection(null); await load() }
    setWorking('')
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'timesheets', label: 'Timesheets' },
    ...(isOwner ? [{ key: 'team' as Tab, label: 'Team' }] : []),
    { key: 'labor', label: 'Job Labor' },
  ]

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-neutral-900">Team Operations</h1>
          <p className="text-sm text-neutral-500 mt-1">Time, people, and labor in one place.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {tabs.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium ${tab === item.key ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700'}`}>
              {item.label}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        {loading && <div className="bg-white border rounded-xl p-12 text-center text-neutral-500">Loading team operations…</div>}

        {!loading && tab === 'overview' && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat label="Clocked in now" value={String(open.length)} accent={open.length ? 'green' : undefined} />
            <Stat label="Period hours" value={hours(totalHours)} />
            <Stat label="Labor cost" value={money(totalLabor)} />
            <Stat label="Needs review" value={String(pending.length)} accent={pending.length ? 'amber' : undefined} />
          </div>
          <section className="bg-white border border-neutral-200 rounded-xl p-4 mb-5">
            <div className="flex justify-between gap-3 mb-3"><h2 className="font-semibold">Working now</h2><span className="text-xs text-neutral-500">{fmtPeriod}</span></div>
            {open.map(entry => <div key={entry.id} className="flex justify-between gap-3 py-3 border-t first:border-t-0">
              <div><p className="font-medium">{memberById.get(entry.team_member_id)?.full_name || 'Team member'}</p><p className="text-xs text-neutral-500">{entry.job_id ? jobById.get(entry.job_id)?.title : 'General time'} · since {formatCompanyTime(entry.clock_in, timeZone)}</p></div>
              <span className="text-xs h-fit bg-green-100 text-green-700 px-2 py-1 rounded-full">Clocked in</span>
            </div>)}
            {!open.length && <p className="text-sm text-neutral-400 py-5 text-center">Nobody is clocked in.</p>}
          </section>
          <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b"><h2 className="font-semibold">Pay-period summary</h2><p className="text-xs text-neutral-500">{fmtPeriod}</p></div>
            {memberTotals.map(row => <button key={row.member.id} onClick={() => setTab('timesheets')} className="w-full p-4 border-b last:border-0 flex justify-between text-left hover:bg-neutral-50">
              <div><p className="font-medium">{row.member.full_name}</p><p className="text-xs text-neutral-500">{row.pending ? `${row.pending} entries need review` : 'All reviewed'}</p></div>
              <div className="text-right"><p className="font-semibold">{hours(row.hours)}</p><p className="text-xs text-neutral-500">{money(row.pay)}</p></div>
            </button>)}
          </section>
        </>}

        {!loading && tab === 'timesheets' && <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold">Current pay period</h2><p className="text-xs text-neutral-500">{fmtPeriod} · {frequency}</p></div>
          {completed.map(entry => {
            const member = memberById.get(entry.team_member_id)
            const approved = entry.approval_status === 'approved'
            return <div key={entry.id} className="p-4 border-b last:border-0">
              <div className="flex justify-between gap-3">
                <div><p className="font-medium">{member?.full_name || 'Team member'}</p><p className="text-sm text-neutral-600">{formatCompanyDate(entry.clock_in, timeZone)} · {formatCompanyTime(entry.clock_in, timeZone)}–{entry.clock_out && formatCompanyTime(entry.clock_out, timeZone)}</p><p className="text-xs text-neutral-500 mt-1">{entry.job_id ? jobById.get(entry.job_id)?.title : 'General / Unallocated'}{entry.activity_summary ? ` · ${entry.activity_summary}` : ''}</p></div>
                <div className="text-right"><p className="font-semibold">{hours(Number(entry.hours_worked || 0))}</p><p className="text-xs text-neutral-500">{money(Number(entry.labor_cost || 0))}</p></div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => edit(entry)} className="px-3 py-1.5 text-xs border border-neutral-200 rounded-lg">Correct</button>
                <button disabled={working === entry.id} onClick={() => approve(entry, !approved)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${approved ? 'bg-green-100 text-green-700' : 'bg-neutral-900 text-white'}`}>
                  {approved ? 'Approved ✓' : 'Approve'}
                </button>
                {entry.corrected_at && <span className="text-xs text-amber-700 self-center">Corrected</span>}
              </div>
            </div>
          })}
          {!completed.length && <p className="p-10 text-center text-sm text-neutral-400">No completed entries this pay period.</p>}
        </section>}

        {!loading && tab === 'team' && <TeamManagement embedded />}

        {!loading && tab === 'labor' && <section className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b"><h2 className="font-semibold">Labor by job</h2><p className="text-xs text-neutral-500">{fmtPeriod}</p></div>
          {[...laborGroups.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([key, group]) =>
            <div key={key} className="p-4 border-b last:border-0 flex justify-between gap-3">
              <div><p className="font-medium">{group.label}</p><p className="text-xs text-neutral-500">{group.entries} time {group.entries === 1 ? 'entry' : 'entries'}</p></div>
              <div className="text-right"><p className="font-semibold">{hours(group.hours)}</p><p className="text-xs text-neutral-500">{money(group.cost)}</p></div>
            </div>
          )}
          {!laborGroups.size && <p className="p-10 text-center text-sm text-neutral-400">No labor logged this pay period.</p>}
        </section>}
      </div>

      {correction && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-xl p-5 w-full max-w-md">
          <h2 className="text-lg font-bold">Correct time entry</h2>
          <p className="text-sm text-neutral-500 mb-4">{memberById.get(correction.entry.team_member_id)?.full_name} · {TIME_ZONE_LABELS[timeZone] || timeZone}</p>
          <label className="text-xs font-medium">Clock in</label>
          <input type="datetime-local" value={correction.clockIn} onChange={e => setCorrection({ ...correction, clockIn: e.target.value })} className="w-full p-2.5 border rounded-lg mb-3" />
          <label className="text-xs font-medium">Clock out</label>
          <input type="datetime-local" value={correction.clockOut} onChange={e => setCorrection({ ...correction, clockOut: e.target.value })} className="w-full p-2.5 border rounded-lg mb-3" />
          <label className="text-xs font-medium">Job allocation</label>
          <select value={correction.jobId} onChange={e => setCorrection({ ...correction, jobId: e.target.value })} className="w-full p-2.5 border rounded-lg mb-3">
            <option value="">General / Unallocated</option>
            {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <label className="text-xs font-medium">Reason</label>
          <input value={correction.reason} onChange={e => setCorrection({ ...correction, reason: e.target.value })} placeholder="Why this was changed" className="w-full p-2.5 border rounded-lg" />
          <div className="grid grid-cols-2 gap-3 mt-5"><button onClick={() => setCorrection(null)} className="py-2.5 border rounded-lg">Cancel</button><button disabled={working === correction.entry.id} onClick={saveCorrection} className="py-2.5 bg-neutral-900 text-white rounded-lg">Save correction</button></div>
        </div>
      </div>}
    </AppLayout>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'green' | 'amber' }) {
  const color = accent === 'green' ? 'text-green-700' : accent === 'amber' ? 'text-amber-700' : 'text-neutral-900'
  return <div className="bg-white border border-neutral-200 rounded-xl p-4"><p className={`text-2xl font-bold ${color}`}>{value}</p><p className="text-xs text-neutral-500 mt-1">{label}</p></div>
}
