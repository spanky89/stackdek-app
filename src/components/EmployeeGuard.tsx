import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

/**
 * EmployeeGuard — redirects team members with role 'employee' or 'manager'
 * away from owner-only routes and toward /employee-dashboard.
 *
 * Owners (no team_members record, or role='owner') pass through normally.
 */
export default function EmployeeGuard({ children }: { children: JSX.Element }) {
  const [role, setRole] = useState<string | null | undefined>(undefined) // undefined = still loading
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    async function checkRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (mounted) setRole(null); return }

        const { data } = await supabase
          .from('team_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (mounted) setRole(data?.role ?? null)
      } catch {
        if (mounted) setRole(null)
      }
    }
    checkRole()
    return () => { mounted = false }
  }, [location.pathname])

  // Still loading
  if (role === undefined) {
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
