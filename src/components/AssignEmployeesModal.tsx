import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

type TeamMember = {
  id: string
  full_name: string
  role: string
  hourly_rate: number | null
}

type Props = {
  jobId: string
  companyId: string
  onConfirm: (selectedIds: string[]) => void
  onCancel: () => void
}

export default function AssignEmployeesModal({ jobId, companyId, onConfirm, onCancel }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [existing, setExisting] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)
    try {
      // Get all active team members (not owner)
      const { data: memberData } = await supabase
        .from('team_members')
        .select('id, full_name, role, hourly_rate')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('role', ['manager', 'employee'])
        .order('full_name')
      setMembers(memberData || [])

      // Get already-assigned members for this job
      const { data: assignedData } = await supabase
        .from('job_assignments')
        .select('team_member_id')
        .eq('job_id', jobId)
      const assignedIds = new Set((assignedData || []).map(a => a.team_member_id))
      setExisting(assignedIds)
      setSelected(new Set(assignedIds)) // pre-check existing
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Remove deselected existing assignments
      const toRemove = [...existing].filter(id => !selected.has(id))
      if (toRemove.length > 0) {
        await supabase
          .from('job_assignments')
          .delete()
          .eq('job_id', jobId)
          .in('team_member_id', toRemove)
      }

      // Add new assignments
      const toAdd = [...selected].filter(id => !existing.has(id))
      if (toAdd.length > 0) {
        await supabase.from('job_assignments').insert(
          toAdd.map(memberId => ({
            job_id: jobId,
            team_member_id: memberId,
            company_id: companyId,
            assigned_by: user!.id,
          }))
        )
      }

      onConfirm([...selected])
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (role: string) => role === 'manager' ? '⚡ Manager' : '👤 Employee'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">Assign Team Members</h2>
          <p className="text-sm text-neutral-500 mt-1">Who's working this job?</p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500">No team members yet.</p>
              <p className="text-xs text-neutral-400 mt-1">Add employees in Team Management first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <button
                  key={member.id}
                  onClick={() => toggle(member.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selected.has(member.id)
                      ? 'border-neutral-900 bg-neutral-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                    selected.has(member.id) ? 'bg-neutral-900 border-neutral-900' : 'border-neutral-300'
                  }`}>
                    {selected.has(member.id) && <span className="text-white text-xs">✓</span>}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-neutral-600">
                      {member.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 text-sm truncate">{member.full_name}</p>
                    <p className="text-xs text-neutral-400">{roleLabel(member.role)}</p>
                  </div>

                  {member.hourly_rate && (
                    <span className="text-xs text-neutral-400 flex-shrink-0">${member.hourly_rate}/hr</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 border-t border-neutral-100 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-neutral-200 text-neutral-700 font-medium py-2.5 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 bg-neutral-900 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : selected.size === 0 ? 'Start Job (No Assignments)' : `Assign ${selected.size} & Start`}
          </button>
        </div>

      </div>
    </div>
  )
}
