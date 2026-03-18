import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import TeamMemberCard from '../components/TeamMemberCard'
import InviteTeamMemberModal from '../components/InviteTeamMemberModal'
import { TeamMemberWithStats, TeamRole } from '../types/teamMember'

// ─── Inline Edit-Role Modal ────────────────────────────────────────────────────
function EditRoleModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMemberWithStats
  onClose: () => void
  onSave: (member: TeamMemberWithStats, newRole: TeamRole) => void
}) {
  const [role, setRole] = useState<TeamRole>(member.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-neutral-900">Edit Role</h2>
        <p className="text-sm text-neutral-600">{member.fullName}</p>
        <p className="text-xs text-neutral-500">{member.email}</p>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as TeamRole)}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="manager">Manager — Full access except billing</option>
            <option value="employee">Employee — Limited to assigned jobs</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(member, role)}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberWithStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)

  const MAX_MEMBERS = 10

  useEffect(() => { loadTeam() }, [])

  async function loadTeam() {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get the owner's company
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (companyErr || !company) {
        setError('Company not found. Make sure you are the account owner.')
        setLoading(false)
        return
      }

      setCompanyId(company.id)

      // Load all team members for this company
      const { data: members, error: membersErr } = await supabase
        .from('team_members')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: true })

      if (membersErr) throw membersErr

      // Map DB rows → TeamMemberWithStats
      const mapped: TeamMemberWithStats[] = (members || []).map(m => ({
        id: m.id,
        companyId: m.company_id,
        userId: m.user_id ?? '',
        email: m.email,
        fullName: m.full_name,
        role: m.role as TeamRole,
        isActive: m.is_active,
        invitedAt: m.invited_at,
        acceptedAt: m.accepted_at ?? undefined,
        createdAt: m.created_at,
        jobsAssigned: 0,
        hoursThisWeek: 0,
      }))

      setTeamMembers(mapped)
    } catch (err: any) {
      setError(err.message || 'Failed to load team')
    } finally {
      setLoading(false)
    }
  }

  function flash(msg: string) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 4000)
  }

  // ── Invite ────────────────────────────────────────────────────────────────
  async function handleInvite(email: string, role: TeamRole) {
    if (!companyId) return
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          company_id: companyId,
          email: email.toLowerCase().trim(),
          full_name: email.split('@')[0], // placeholder until they set their name
          role,
          is_active: false, // stays false until invite accepted
          invited_at: new Date().toISOString(),
        })

      if (error) {
        if (error.code === '23505') {
          flash('❌ This email is already on your team')
        } else {
          throw error
        }
        return
      }

      setShowInviteModal(false)
      flash(`✅ Invitation recorded for ${email}`)
      loadTeam()
    } catch (err: any) {
      flash(`❌ ${err.message || 'Failed to send invitation'}`)
    }
  }

  // ── Change Role ───────────────────────────────────────────────────────────
  async function handleRoleChange(member: TeamMemberWithStats, newRole: TeamRole) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', member.id)

      if (error) throw error

      setEditingMember(null)
      flash(`✅ Role updated for ${member.fullName}`)
      loadTeam()
    } catch (err: any) {
      flash(`❌ ${err.message || 'Failed to update role'}`)
    }
  }

  // ── Deactivate / Reactivate ───────────────────────────────────────────────
  async function handleToggleActive(member: TeamMemberWithStats) {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: !member.isActive, updated_at: new Date().toISOString() })
        .eq('id', member.id)

      if (error) throw error

      flash(`✅ ${member.fullName} ${member.isActive ? 'deactivated' : 'reactivated'}`)
      loadTeam()
    } catch (err: any) {
      flash(`❌ ${err.message || 'Failed to update member'}`)
    }
  }

  // ── Remove ────────────────────────────────────────────────────────────────
  async function handleRemove(member: TeamMemberWithStats) {
    if (!confirm(`Remove ${member.fullName} from your team? This cannot be undone.`)) return
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id)

      if (error) throw error

      flash(`✅ ${member.fullName} removed from team`)
      loadTeam()
    } catch (err: any) {
      flash(`❌ ${err.message || 'Failed to remove member'}`)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredMembers = teamMembers.filter(m => {
    if (filter === 'active') return m.isActive
    if (filter === 'inactive') return !m.isActive
    return true
  })

  const activeCount = teamMembers.filter(m => m.isActive).length
  const inactiveCount = teamMembers.filter(m => !m.isActive).length

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <p className="text-neutral-600">Loading team…</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-neutral-900">Team Management</h1>
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={teamMembers.length >= MAX_MEMBERS}
              className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Invite Team Member
            </button>
          </div>
          <p className="text-neutral-600">
            Manage your team members and assign roles. Pro plan supports up to {MAX_MEMBERS} team members.
          </p>

          {/* Feedback banners */}
          {message && (
            <div className={`mt-3 p-3 rounded-lg text-sm border ${
              message.startsWith('✅')
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {message}
            </div>
          )}
          {error && (
            <div className="mt-3 p-3 rounded-lg text-sm bg-red-50 text-red-800 border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <p className="text-sm text-neutral-600 mb-1">Total Members</p>
            <p className="text-2xl font-bold text-neutral-900">{teamMembers.length} / {MAX_MEMBERS}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <p className="text-sm text-neutral-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-lg p-4">
            <p className="text-sm text-neutral-600 mb-1">Pending / Inactive</p>
            <p className="text-2xl font-bold text-neutral-400">{inactiveCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {f === 'all' ? `All (${teamMembers.length})` : f === 'active' ? `Active (${activeCount})` : `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <p className="text-neutral-500 mb-2">
                {filter === 'all' ? 'No team members yet' : `No ${filter} members`}
              </p>
              {filter === 'all' && (
                <p className="text-sm text-neutral-400">
                  Invite your first team member using the button above.
                </p>
              )}
            </div>
          ) : (
            filteredMembers.map(member => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onEdit={() => setEditingMember(member)}
                onRemove={handleRemove}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </div>

        {/* Pro badge */}
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-semibold text-purple-900">Pro Feature</p>
              <p className="text-xs text-purple-800">
                Multi-user access is available on the Pro plan. Invite up to {MAX_MEMBERS} team members with role-based permissions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InviteTeamMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        currentMemberCount={teamMembers.length}
        maxMembers={MAX_MEMBERS}
      />

      {editingMember && (
        <EditRoleModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={handleRoleChange}
        />
      )}
    </AppLayout>
  )
}
