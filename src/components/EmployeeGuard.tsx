import { Navigate } from 'react-router-dom'
import { useAccess } from '../context/AccessContext'

/**
 * EmployeeGuard — redirects team members with role 'employee' or 'manager'
 * away from owner-only routes and toward /employee-dashboard.
 *
 * Owners (no team_members record, or role='owner') pass through normally.
 */
export default function EmployeeGuard({ children }: { children: JSX.Element }) {
  const { role, loading } = useAccess()

  // Still loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Checking permissions…</p>
      </div>
    )
  }

  // Employees and managers are redirected to their dashboard
  if (role === 'employee' || role === 'manager') {
    return <Navigate to="/employee-dashboard" replace />
  }

  // Owners and unassigned users pass through
  return children
}
