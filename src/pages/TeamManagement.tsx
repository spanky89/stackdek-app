import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import TeamMemberCard from '../components/TeamMemberCard'
import InviteTeamMemberModal from '../components/InviteTeamMemberModal'
import { mockTeamMembers, TeamMemberWithStats, TeamRole } from '../types/teamMember'

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStats[]>(mockTeamMembers)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active')

  const MAX_MEMBERS = 10 // Pro tier limit

  const handleInvite = (email: string, role: TeamRole) => {
    // Mock: Add to team members list
    const newMember: TeamMemberWithStats = {
      id: `new-${Date.now()}`,
      companyId: 'company-1',
      userId: `user-new-${Date.now()}`,
      email,
      fullName: email.split('@')[0], // Mock: Use email username as name
      role,
      isActive: false, // Pending acceptance
      invitedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      jobsAssigned: 0,
      hoursThisWeek: 0
    }

    setTeamMembers([...teamMembers, newMember])
    setShowInviteModal(false)
    alert(`Invitation sent to ${email}!`)
  }

  const handleEdit = (member: TeamMemberWithStats) => {
    alert(`Edit ${member.fullName} - This will open an edit modal`)
  }

  const handleRemove = (member: TeamMemberWithStats) => {
    if (confirm(`Remove ${member.fullName} from your team?`)) {
      setTeamMembers(teamMembers.filter(m => m.id !== member.id))
      alert(`${member.fullName} removed from team`)
    }
  }

  const handleToggleActive = (member: TeamMemberWithStats) => {
    setTeamMembers(
      teamMembers.map(m =>
        m.id === member.id ? { ...m, isActive: !m.isActive } : m
      )
    )
  }

  const filteredMembers = teamMembers.filter(member => {
    if (filter === 'active') return member.isActive
    if (filter === 'inactive') return !member.isActive
    return true
  })

  const activeCount = teamMembers.filter(m => m.isActive).length
  const inactiveCount = teamMembers.filter(m => !m.isActive).length

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
        </div>

        {/* Stats Cards */}
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
            <p className="text-sm text-neutral-600 mb-1">Pending/Inactive</p>
            <p className="text-2xl font-bold text-neutral-400">{inactiveCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              All ({teamMembers.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'inactive'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-4">
          {filteredMembers.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
              <p className="text-neutral-600">No team members found</p>
            </div>
          ) : (
            filteredMembers.map(member => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onEdit={handleEdit}
                onRemove={handleRemove}
                onToggleActive={handleToggleActive}
              />
            ))
          )}
        </div>

        {/* Pro Feature Badge */}
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

      {/* Invite Modal */}
      <InviteTeamMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        currentMemberCount={teamMembers.length}
        maxMembers={MAX_MEMBERS}
      />
    </AppLayout>
  )
}
