import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

interface SubscriptionStatus {
  plan: string
  status: string
  expiresAt: string | null
  trialEndsAt: string | null
}

export default function SubscriptionBanner() {
  const nav = useNavigate()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  async function checkSubscription() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('subscription_plan, subscription_status, subscription_expires_at, trial_ends_at')
        .eq('owner_id', user.id)
        .single()

      if (company) {
        setSubscription({
          plan: company.subscription_plan || 'basic',
          status: company.subscription_status || 'inactive',
          expiresAt: company.subscription_expires_at,
          trialEndsAt: company.trial_ends_at,
        })
      }
    } catch (err) {
      console.error('Error checking subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  function getTrialDaysRemaining(): number | null {
    if (!subscription?.trialEndsAt) return null
    const now = new Date()
    const trialEnd = new Date(subscription.trialEndsAt)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  function isExpired(): boolean {
    if (!subscription) return false
    
    // Check trial expiration
    const trialDays = getTrialDaysRemaining()
    if (trialDays !== null && trialDays <= 0 && subscription.plan === 'basic') {
      return true
    }

    // Check paid subscription expiration
    if (subscription.status === 'inactive' || subscription.status === 'canceled') {
      if (!subscription.expiresAt) return false
      const now = new Date()
      const expiresAt = new Date(subscription.expiresAt)
      return now > expiresAt
    }

    // Past due status
    if (subscription.status === 'past_due') {
      return true
    }

    return false
  }

  function isPastDue(): boolean {
    return subscription?.status === 'past_due'
  }

  function isCanceled(): boolean {
    return subscription?.status === 'canceled'
  }

  if (loading || !subscription || dismissed) return null

  const expired = isExpired()
  const pastDue = isPastDue()
  const canceled = isCanceled()
  const trialDays = getTrialDaysRemaining()

  // Show trial warning (3 days or less remaining)
  if (trialDays !== null && trialDays <= 3 && trialDays > 0) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-600 text-xl">⏰</span>
            <div>
              <p className="text-sm font-medium text-yellow-900">
                Trial ending soon - {trialDays} day{trialDays !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-xs text-yellow-700">
                Upgrade now to keep full access to StackDek
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav('/settings/billing')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
            >
              Upgrade Now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-yellow-600 hover:text-yellow-800 px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show expired/past due warning
  if (expired || pastDue) {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-red-600 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-900">
                {pastDue ? 'Payment past due' : 'Subscription expired'}
              </p>
              <p className="text-xs text-red-700">
                {pastDue 
                  ? 'Please update your payment method to continue using StackDek'
                  : 'Renew your subscription to continue using StackDek'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav('/settings/billing')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              {pastDue ? 'Update Payment' : 'Renew Now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show canceled warning (still has time until expiration)
  if (canceled && subscription.expiresAt) {
    const expirationDate = new Date(subscription.expiresAt).toLocaleDateString()
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-orange-600 text-xl">ℹ️</span>
            <div>
              <p className="text-sm font-medium text-orange-900">
                Subscription canceled - Access until {expirationDate}
              </p>
              <p className="text-xs text-orange-700">
                Reactivate your subscription to continue using StackDek
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav('/settings/billing')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
            >
              Reactivate
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-orange-600 hover:text-orange-800 px-2"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
