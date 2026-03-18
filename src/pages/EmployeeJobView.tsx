import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Photo = { url: string; caption: string; order: number }

type Job = {
  id: string
  title: string
  description: string | null
  date_scheduled: string | null
  location: string | null
  status: string
  video_url: string | null
  photos: Photo[]
  quote_id: string | null
  clients: { name: string; phone: string | null; address: string | null } | null
}

type LineItem = {
  id: string
  description: string
  quantity: number
  sort_order: number
}

type Task = {
  id: string
  title: string
  is_completed: boolean
  due_date: string | null
}

type TimeEntry = {
  id: string
  clock_in: string
  clock_out: string | null
  hours_worked: number | null
}

type Expense = {
  id: string
  amount: number
  category: string
  description: string | null
  status: string
  created_at: string
  receipt_url: string | null
}

const CATEGORIES = [
  { value: 'materials', label: '🔨 Materials' },
  { value: 'equipment', label: '🚜 Equipment' },
  { value: 'subcontractors', label: '⚡ Subcontractors' },
  { value: 'permits', label: '📝 Permits' },
  { value: 'fuel', label: '⛽ Fuel' },
  { value: 'other', label: '💰 Other' },
]

export default function EmployeeJobView() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()

  const [job, setJob] = useState<Job | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [teamMember, setTeamMember] = useState<{ id: string; full_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'expenses'>('overview')

  // Clock in/out state
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null)
  const [clockingIn, setClockingIn] = useState(false)
  const [clockingOut, setClockinOut] = useState(false)
  const [elapsed, setElapsed] = useState('')

  // Add expense state
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: 'materials', description: '', notes: '' })
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Load everything
  useEffect(() => {
    loadData()
  }, [id])

  // Elapsed timer
  useEffect(() => {
    if (!openEntry) { setElapsed(''); return }
    const tick = () => {
      const diff = Date.now() - new Date(openEntry.clock_in).getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h}h ${m}m ${s}s`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [openEntry])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { nav('/login'); return }

      // Get team member record
      const { data: tm } = await supabase
        .from('team_members')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single()
      setTeamMember(tm)

      // Get job
      const { data: jobData } = await supabase
        .from('jobs')
        .select('*, clients(name, phone, address)')
        .eq('id', id)
        .single()
      setJob(jobData)

      // Get line items (from job_line_items first, fallback to quote_line_items)
      const { data: jobItems } = await supabase
        .from('job_line_items')
        .select('id, description, quantity, sort_order')
        .eq('job_id', id)
        .order('sort_order')

      if (jobItems && jobItems.length > 0) {
        setLineItems(jobItems)
      } else if (jobData?.quote_id) {
        const { data: quoteItems } = await supabase
          .from('quote_line_items')
          .select('id, description, quantity, sort_order')
          .eq('quote_id', jobData.quote_id)
          .order('sort_order')
        setLineItems(quoteItems || [])
      }

      // Get tasks for this job
      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, title, is_completed, due_date')
        .eq('job_id', id)
        .order('created_at')
      setTasks(taskData || [])

      // Get time entries for this employee + job
      if (tm) {
        const { data: timeData } = await supabase
          .from('time_entries')
          .select('*')
          .eq('team_member_id', tm.id)
          .eq('job_id', id)
          .order('clock_in', { ascending: false })
        setTimeEntries(timeData || [])
        const open = timeData?.find(e => !e.clock_out) || null
        setOpenEntry(open)

        // Get expenses
        const { data: expData } = await supabase
          .from('job_expenses')
          .select('*')
          .eq('job_id', id)
          .eq('added_by', user.id)
          .order('created_at', { ascending: false })
        setExpenses(expData || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function clockIn() {
    if (!teamMember || !job) return
    setClockingIn(true)
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .single()

      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          team_member_id: teamMember.id,
          job_id: job.id,
          company_id: company?.id,
          clock_in: new Date().toISOString(),
        })
        .select()
        .single()

      if (!error && data) {
        setOpenEntry(data)
        setTimeEntries(prev => [data, ...prev])
      }
    } finally {
      setClockingIn(false)
    }
  }

  async function clockOut() {
    if (!openEntry) return
    setClockinOut(true)
    try {
      const clockOutTime = new Date().toISOString()
      const hoursWorked = (Date.now() - new Date(openEntry.clock_in).getTime()) / 3600000

      const { error } = await supabase
        .from('time_entries')
        .update({
          clock_out: clockOutTime,
          hours_worked: Math.round(hoursWorked * 100) / 100,
        })
        .eq('id', openEntry.id)

      if (!error) {
        setOpenEntry(null)
        setTimeEntries(prev => prev.map(e =>
          e.id === openEntry.id
            ? { ...e, clock_out: clockOutTime, hours_worked: Math.round(hoursWorked * 100) / 100 }
            : e
        ))
      }
    } finally {
      setClockinOut(false)
    }
  }

  async function toggleTask(task: Task) {
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
    }
  }

  async function submitExpense() {
    if (!teamMember || !job || !expenseForm.amount || !expenseForm.category) return
    setSubmittingExpense(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: company } = await supabase.from('companies').select('id').single()

      let receiptUrl = null

      // Upload receipt if provided
      if (receiptFile && company) {
        const ext = receiptFile.name.split('.').pop()
        const path = `${company.id}/${job.id}/${Date.now()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('job-receipts')
          .upload(path, receiptFile)
        if (!uploadErr) receiptUrl = path
      }

      const { error } = await supabase.from('job_expenses').insert({
        job_id: job.id,
        company_id: company?.id,
        added_by: user!.id,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description || null,
        notes: expenseForm.notes || null,
        receipt_url: receiptUrl,
        status: 'pending',
      })

      if (!error) {
        setExpenseForm({ amount: '', category: 'materials', description: '', notes: '' })
        setReceiptFile(null)
        setShowExpenseForm(false)
        loadData()
      }
    } finally {
      setSubmittingExpense(false)
    }
  }

  function totalHours() {
    return timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0).toFixed(1)
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    </AppLayout>
  )

  if (!job) return (
    <AppLayout>
      <div className="text-center py-16 text-neutral-500">Job not found or not assigned to you.</div>
    </AppLayout>
  )

  const completedTasks = tasks.filter(t => t.is_completed).length

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-24">

        {/* Header */}
        <div className="mb-4">
          <button onClick={() => nav('/employee-dashboard')} className="text-sm text-neutral-500 hover:text-neutral-900 mb-3 flex items-center gap-1">
            ← Back
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{job.title}</h1>
              {job.clients && <p className="text-neutral-500 text-sm mt-1">{job.clients.name}</p>}
              {job.location && <p className="text-neutral-500 text-sm">{job.location}</p>}
              {job.date_scheduled && (
                <p className="text-neutral-500 text-sm">
                  {new Date(job.date_scheduled).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              job.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-neutral-100 text-neutral-700'
            }`}>
              {job.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Clock In/Out Card */}
        <div className={`rounded-xl p-5 mb-4 ${openEntry ? 'bg-green-50 border border-green-200' : 'bg-white border border-neutral-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-neutral-900">{openEntry ? '🟢 Clocked In' : '⏱ Ready to Start?'}</p>
              {openEntry && (
                <p className="text-sm text-green-700 font-mono mt-1">{elapsed}</p>
              )}
              {!openEntry && (
                <p className="text-sm text-neutral-500">Total logged: {totalHours()}h on this job</p>
              )}
            </div>
            {openEntry ? (
              <button
                onClick={clockOut}
                disabled={clockingOut}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {clockingOut ? 'Saving...' : 'Clock Out'}
              </button>
            ) : (
              <button
                onClick={clockIn}
                disabled={clockingIn}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {clockingIn ? 'Starting...' : 'Clock In'}
              </button>
            )}
          </div>
          {/* Time history */}
          {timeEntries.length > 0 && (
            <div className="border-t border-neutral-200 pt-3 mt-2 space-y-1">
              {timeEntries.filter(e => e.clock_out).slice(0, 3).map(e => (
                <div key={e.id} className="flex justify-between text-xs text-neutral-500">
                  <span>{new Date(e.clock_in).toLocaleDateString()}</span>
                  <span>{e.hours_worked}h</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 mb-4">
          {(['overview', 'tasks', 'expenses'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-neutral-900 text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {tab === 'tasks' ? `Tasks (${completedTasks}/${tasks.length})` : tab}
              {tab === 'expenses' && expenses.length > 0 ? ` (${expenses.length})` : ''}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">

            {/* Job Overview Video */}
            {job.video_url && (
              <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="font-semibold text-neutral-900 flex items-center gap-2">
                    🎬 Job Overview Video
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">Watch before starting — review what needs to be done</p>
                </div>
                <div className="aspect-video bg-black">
                  <video
                    src={job.video_url}
                    controls
                    className="w-full h-full"
                    playsInline
                  />
                </div>
              </div>
            )}

            {/* Photos */}
            {job.photos && job.photos.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-900 mb-3">📸 Job Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {job.photos.map((photo, i) => (
                    <a key={i} href={photo.url} target="_blank" rel="noreferrer">
                      <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} className="rounded-lg w-full h-32 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-900 mb-2">📋 Description</p>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            )}

            {/* Line Items (no prices) */}
            {lineItems.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-900 mb-3">🔧 Work Scope</p>
                <div className="space-y-2">
                  {lineItems.map((item, i) => (
                    <div key={item.id} className="flex gap-3 py-2 border-b border-neutral-100 last:border-0">
                      <span className="text-xs text-neutral-400 font-mono w-5 pt-0.5">{i + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-neutral-800">{item.description}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client contact */}
            {job.clients?.phone && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <p className="font-semibold text-neutral-900 mb-2">👤 Client</p>
                <a href={`tel:${job.clients.phone}`} className="text-sm text-blue-600 hover:underline">
                  📞 {job.clients.phone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
            {tasks.length === 0 && (
              <p className="text-sm text-neutral-400 text-center py-8">No tasks for this job yet.</p>
            )}
            {tasks.map(task => (
              <div key={task.id} className="flex items-start gap-3 p-4">
                <button
                  onClick={() => toggleTask(task)}
                  className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    task.is_completed ? 'bg-green-500 border-green-500' : 'border-neutral-300'
                  }`}
                >
                  {task.is_completed && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${task.is_completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                    {task.title}
                  </p>
                  {task.due_date && (
                    <p className="text-xs text-neutral-400 mt-0.5">Due {new Date(task.due_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-xl text-sm"
            >
              + Add Expense
            </button>

            {/* Add Expense Form */}
            {showExpenseForm && (
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                <p className="font-semibold text-neutral-900">New Expense</p>

                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-2">Category *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setExpenseForm(p => ({ ...p, category: cat.value }))}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border ${
                          expenseForm.category === cat.value
                            ? 'bg-neutral-900 text-white border-neutral-900'
                            : 'border-neutral-200 text-neutral-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Pressure treated lumber"
                    value={expenseForm.description}
                    onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-600 block mb-1">Receipt Photo (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-neutral-600"
                  />
                  {receiptFile && <p className="text-xs text-green-600 mt-1">✓ {receiptFile.name}</p>}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowExpenseForm(false)}
                    className="flex-1 border border-neutral-200 text-neutral-700 font-medium py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitExpense}
                    disabled={submittingExpense || !expenseForm.amount}
                    className="flex-1 bg-neutral-900 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {submittingExpense ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            )}

            {/* Expense list */}
            {expenses.length === 0 && !showExpenseForm && (
              <p className="text-sm text-neutral-400 text-center py-8">No expenses logged yet.</p>
            )}
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white border border-neutral-200 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-neutral-900">${exp.amount.toFixed(2)}</p>
                    <p className="text-sm text-neutral-600 capitalize">{exp.category}</p>
                    {exp.description && <p className="text-xs text-neutral-400 mt-0.5">{exp.description}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    exp.status === 'approved' ? 'bg-green-100 text-green-700' :
                    exp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {exp.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-2">{new Date(exp.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
