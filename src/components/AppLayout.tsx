import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import Header from './Header'
import BottomMenu from './BottomMenu'
import SubscriptionBanner from './SubscriptionBanner'
import { useCompany } from '../context/CompanyContext'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { companyId } = useCompany()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [savingTask, setSavingTask] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestEmail, setRequestEmail] = useState('')
  const [requestPhone, setRequestPhone] = useState('')
  const [requestServiceType, setRequestServiceType] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [requestDate, setRequestDate] = useState('')
  const [savingRequest, setSavingRequest] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  async function saveTask() {
    if (!taskTitle.trim()) return

    setSavingTask(true)
    setTaskError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setTaskError('Not logged in')
        return
      }

      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single()
      
      if (companyErr) {
        setTaskError('Company not found')
        return
      }
      
      if (!company) {
        setTaskError('No company data')
        return
      }

      const { error: err } = await supabase
        .from('reminders')
        .insert({
          company_id: company.id,
          title: taskTitle,
          due_date: taskDueDate || new Date().toISOString().split('T')[0],
        })

      if (err) {
        setTaskError(err.message || 'Failed to create task')
        return
      }
      
      setTaskTitle('')
      setTaskDueDate('')
      setShowTaskModal(false)
      setTaskError(null)
      // Refresh page after a brief delay
      setTimeout(() => window.location.reload(), 500)
    } catch (e: any) {
      setTaskError(e?.message ?? 'Unknown error')
      console.error(e)
    } finally {
      setSavingTask(false)
    }
  }

  async function saveRequest() {
    if (!requestName.trim()) return

    setSavingRequest(true)
    setRequestError(null)
    try {
      if (!companyId) {
        setRequestError('Company not found')
        return
      }

      // Check if client already exists (by email or phone)
      let clientId: string | null = null
      if (requestEmail) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', companyId)
          .eq('email', requestEmail)
          .single()
        
        if (existingClient) {
          clientId = existingClient.id
        }
      }

      // If client doesn't exist, create one
      if (!clientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            company_id: companyId,
            name: requestName,
            email: requestEmail || null,
            phone: requestPhone || null,
          })
          .select('id')
          .single()

        if (clientErr) {
          setRequestError('Failed to create client: ' + clientErr.message)
          return
        }

        clientId = newClient.id
      }

      // Now create the request
      const { error: err } = await supabase
        .from('requests')
        .insert({
          company_id: companyId,
          client_name: requestName,
          client_email: requestEmail,
          client_phone: requestPhone,
          service_type: requestServiceType,
          description: requestDescription,
          requested_date: requestDate || new Date().toISOString().split('T')[0],
          status: 'pending',
        })

      if (err) {
        setRequestError(err.message || 'Failed to create request')
        return
      }
      
      setRequestName('')
      setRequestEmail('')
      setRequestPhone('')
      setRequestServiceType('')
      setRequestDescription('')
      setRequestDate('')
      setShowRequestModal(false)
      setRequestError(null)
      // Refresh page
      setTimeout(() => window.location.reload(), 500)
    } catch (e: any) {
      setRequestError(e?.message ?? 'Unknown error')
      console.error(e)
    } finally {
      setSavingRequest(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <SubscriptionBanner />
      <div className="flex-1 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Header />
          {children}
        </div>
      </div>
      <BottomMenu onNewTask={() => setShowTaskModal(true)} onNewRequest={() => setShowRequestModal(true)} />

      {/* New Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTaskModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Task</h2>
            <input
              type="text"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
              placeholder="Task title"
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-xs text-neutral-600 mb-1">Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={e => setTaskDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
              />
            </div>
            {taskError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium">{taskError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTaskModal(false)
                  setTaskError(null)
                }}
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveTask}
                disabled={savingTask || !taskTitle.trim()}
                className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {savingTask ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 my-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">New Request</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={requestName}
                onChange={e => setRequestName(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                placeholder="Client name"
                autoFocus
              />
              <input
                type="email"
                value={requestEmail}
                onChange={e => setRequestEmail(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                placeholder="Email"
              />
              <input
                type="tel"
                value={requestPhone}
                onChange={e => setRequestPhone(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                placeholder="Phone"
              />
              <input
                type="text"
                value={requestServiceType}
                onChange={e => setRequestServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                placeholder="Service type"
              />
              <textarea
                value={requestDescription}
                onChange={e => setRequestDescription(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20 resize-none"
                placeholder="Description"
                rows={3}
              />
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Requested Date</label>
                <input
                  type="date"
                  value={requestDate}
                  onChange={e => setRequestDate(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                />
              </div>
            </div>
            {requestError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium">{requestError}</p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRequestModal(false)
                  setRequestError(null)
                }}
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg font-medium hover:bg-neutral-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveRequest}
                disabled={savingRequest || !requestName.trim()}
                className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
              >
                {savingRequest ? 'Creating…' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
