import { useState } from 'react'
import { TeamRole } from '../types/teamMember'

interface InviteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: TeamRole) => void
  currentMemberCount: number
  maxMembers: number
}

export default function InviteTeamMemberModal({
  isOpen,
  onClose,
  onInvite,
  currentMemberCount,
  maxMembers
}: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('employee')

  if (!isOpen) return null

  const handleInvite = () => {
    if (!email.trim()) {
      alert('Please enter an email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address')
      return
    }

    if (currentMemberCount >= maxMembers) {
      alert(`You've reached the maximum of ${maxMembers} team members`)
      return
    }

    onInvite(email, role)
    
    // Reset form
    setEmail('')
    setRole('employee')
  }

  const handleClose = () => {
    setEmail('')
    setRole('employee')
    onClose()
  }

  const atLimit = currentMemberCount >= maxMembers

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">Invite Team Member</h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Limit Warning */}
          {atLimit ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900 font-medium">
                You've reached the maximum of {maxMembers} team members
              </p>
              <p className="text-sm text-red-800 mt-1">
                Remove an existing member or upgrade your plan to add more.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {currentMemberCount} of {maxMembers} team members used
              </p>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              disabled={atLimit}
            />
            <p className="text-xs text-neutral-500 mt-1">
              They'll receive an invitation link to join your team
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Role <span className="text-red-600">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              disabled={atLimit}
            >
              <option value="manager">Manager - Full access except billing</option>
              <option value="employee">Employee - Limited to assigned jobs</option>
            </select>
          </div>

          {/* Role Descriptions */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2">
            <div>
              <p className="text-sm font-medium text-neutral-900">⚡ Manager</p>
              <p className="text-xs text-neutral-600">
                Can view and manage all jobs, clients, quotes, and invoices. Cannot access billing or delete the company.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-200">
              <p className="text-sm font-medium text-neutral-900">👤 Employee</p>
              <p className="text-xs text-neutral-600">
                Can only see jobs assigned to them. Cannot see prices or access company settings. Can clock in/out.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 flex gap-3 justify-end bg-neutral-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!email.trim() || atLimit}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send Invitation
          </button>
        </div>
      </div>
    </div>
  )
}
