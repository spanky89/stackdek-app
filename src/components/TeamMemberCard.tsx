import { TeamMemberWithStats } from '../types/teamMember'

interface TeamMemberCardProps {
  member: TeamMemberWithStats
  onEdit?: (member: TeamMemberWithStats) => void
  onRemove?: (member: TeamMemberWithStats) => void
  onToggleActive?: (member: TeamMemberWithStats) => void
}

export default function TeamMemberCard({ member, onEdit, onRemove, onToggleActive }: TeamMemberCardProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'employee':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-neutral-100 text-neutral-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return '👑'
      case 'manager':
        return '⚡'
      case 'employee':
        return '👤'
      default:
        return '•'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${member.isActive ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-neutral-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-xl flex-shrink-0">
            {getRoleIcon(member.role)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-neutral-900 truncate">{member.fullName}</h3>
              {!member.isActive && (
                <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-600 truncate">{member.email}</p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${getRoleBadgeColor(member.role)}`}>
                {getRoleIcon(member.role)} {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Dropdown */}
        {member.role !== 'owner' && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(member)}
                className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
                title="Edit"
              >
                Edit
              </button>
            )}
            {onRemove && member.role !== 'owner' && (
              <button
                onClick={() => onRemove(member)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
                title="Remove"
              >
                Remove
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {member.isActive && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-200">
          <div>
            <p className="text-xs text-neutral-500">Jobs</p>
            <p className="text-sm font-medium text-neutral-900">{member.jobsAssigned || 0}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Hours/Week</p>
            <p className="text-sm font-medium text-neutral-900">{member.hoursThisWeek || 0}h</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Status</p>
            <p className="text-sm font-medium text-green-600">Active</p>
          </div>
        </div>
      )}

      {/* Inactive status */}
      {!member.isActive && onToggleActive && (
        <div className="pt-3 border-t border-neutral-200">
          <button
            onClick={() => onToggleActive(member)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reactivate Member
          </button>
        </div>
      )}
    </div>
  )
}
