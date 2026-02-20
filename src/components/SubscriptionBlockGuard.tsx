import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

interface Company {
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'none'
  trial_ends_at: string | null
  subscription_current_period_end: string | null
}

/**
 * Hard subscription gate - blocks app access if subscription is invalid
 * Allows access during trial period
 * Redirects to billing page when expired
 */
export default function SubscriptionBlockGuard({ children }: { children: JSX.Element }) {
  const nav = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [location.pathname])

  async function checkAccess() {
    try {
      // Always allow access to billing/settings pages
      if (
        location.pathname.startsWith('/settings') ||
        location.pathname.startsWith('/account')
      ) {
        setHasAccess(true)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('subscription_status, trial_ends_at, subscription_current_period_end')
        .eq('owner_id', user.id)
        .single()

      if (!company) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      const access = isSubscriptionValid(company)
      setHasAccess(access)

      // If no access, redirect to billing
      if (!access) {
        nav('/settings/billing', { replace: true })
      }
    } catch (err) {
      console.error('Subscription check error:', err)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  function isSubscriptionValid(company: Company): boolean {
    const { subscription_status, trial_ends_at } = company

    // Active subscription = full access
    if (subscription_status === 'active') {
      return true
    }

    // Trial: check if still valid
    if (subscription_status === 'trial' && trial_ends_at) {
      const now = new Date()
      const trialEnd = new Date(trial_ends_at)
      return now < trialEnd // Access if trial hasn't expired
    }

    // Past due: allow grace period (optional - you can block immediately)
    // Currently: blocks immediately
    if (subscription_status === 'past_due') {
      return false
    }

    // Canceled or none = no access
    return false
  }

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
            Your trial has expired. Subscribe to continue using StackDek.
          </p>
          <button
            onClick={() => nav('/settings/billing')}
            className="w-full py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition"
          >
            View Pricing & Subscribe
          </button>
        </div>
      </div>
    )
  }

  return children
}
