import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAccess } from '../context/AccessContext'

type RoleGuardProps = {
  children: ReactNode
  allow: Array<'owner' | 'manager' | 'employee'>
  fallback?: string
}

export default function RoleGuard({
  children,
  allow,
  fallback,
}: RoleGuardProps) {
  const { role, loading } = useAccess()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600">Checking permissions…</p>
      </div>
    )
  }

  const resolvedRole = role === 'manager' || role === 'employee' ? role : 'owner'
  if (!allow.includes(resolvedRole)) {
    const destination = fallback
      ?? (resolvedRole === 'employee' ? '/employee-dashboard' : '/home')
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
