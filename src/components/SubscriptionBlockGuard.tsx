import { useNavigate, useLocation } from 'react-router-dom'
import { useAccess } from '../context/AccessContext'

/**
 * Hard subscription gate - blocks app access if subscription is invalid
 * Allows access during trial period
 * Redirects to billing page when expired
 */
export default function SubscriptionBlockGuard({ children }: { children: JSX.Element }) {
  const nav = useNavigate()
  const location = useLocation()
  const { loading, subscriptionValid, role } = useAccess()
  const isOwner = !role
  const bypassBillingGate = location.pathname.startsWith('/settings')
    || location.pathname.startsWith('/account')
  const hasAccess = bypassBillingGate || subscriptionValid

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <p className="text-neutral-600">Checking subscription...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    // This screen only shows if nav fails (shouldn't happen normally)
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">Subscription Required</h1>
          <p className="text-neutral-600 mb-6">
            {isOwner
              ? 'Your trial has expired. Subscribe to continue using StackDek.'
              : 'Your company’s Pro subscription is inactive. Contact the account owner.'}
          </p>
          {isOwner && (
            <button
              onClick={() => nav('/settings/billing')}
              className="w-full py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition"
            >
              View Pricing & Subscribe
            </button>
          )}
        </div>
      </div>
    )
  }

  return children
}
