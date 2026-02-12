import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

interface Company {
  id: string
  name: string
  subscription_plan: string
  subscription_status: string
  subscription_expires_at: string | null
  trial_ends_at: string | null
}

const PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    features: [
      'Up to 50 clients',
      'Up to 100 jobs per month',
      'Basic quote management',
      'Email support',
      'StackDek branding on quotes',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited clients',
      'Unlimited jobs',
      'Advanced quote management',
      'Priority email support',
      'Remove StackDek branding',
      'Custom invoice templates',
      'Analytics dashboard',
    ],
  },
  premium: {
    name: 'Premium',
    price: 99,
    features: [
      'Everything in Pro',
      'White-label solution',
      'Dedicated account manager',
      'Phone support',
      'Custom integrations',
      'Advanced reporting',
      'Multi-user support (coming soon)',
    ],
  },
}

export default function BillingSettingsPage() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check for success/cancel from Stripe checkout
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success) {
      setMessage('✅ Subscription activated successfully!')
      setTimeout(() => setMessage(''), 5000)
    } else if (canceled) {
      setMessage('⚠️ Subscription upgrade canceled')
      setTimeout(() => setMessage(''), 5000)
    }
  }, [searchParams])

  useEffect(() => {
    fetchCompany()
  }, [])

  async function fetchCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        nav('/login')
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id, name, subscription_plan, subscription_status, subscription_expires_at, trial_ends_at')
        .eq('owner_id', user.id)
        .single()

      if (company) {
        setCompany(company)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(plan: string) {
    if (!company) return

    setProcessing(true)
    setMessage('')

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('❌ Not authenticated')
        setProcessing(false)
        return
      }

      const response = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create subscription')
      }

      // For basic plan (free), reload page
      if (plan === 'basic') {
        setMessage('✅ ' + data.message)
        await fetchCompany()
        setProcessing(false)
        return
      }

      // For paid plans, redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Failed to upgrade subscription'))
      setProcessing(false)
    }
  }

  function getTrialDaysRemaining() {
    if (!company?.trial_ends_at) return null
    const now = new Date()
    const trialEnd = new Date(company.trial_ends_at)
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  function getExpirationDate() {
    if (!company?.subscription_expires_at) return null
    return new Date(company.subscription_expires_at).toLocaleDateString()
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading billing information...</p>
        </div>
      </AppLayout>
    )
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-red-600">Company not found</p>
        </div>
      </AppLayout>
    )
  }

  const currentPlan = company.subscription_plan || 'basic'
  const trialDays = getTrialDaysRemaining()
  const expirationDate = getExpirationDate()

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Billing & Subscription</h1>
            <p className="text-sm text-neutral-600 mt-1">Manage your StackDek subscription plan</p>
          </div>
          <button
            onClick={() => nav('/settings')}
            className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm"
          >
            ← Back to Settings
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {/* Current Plan Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-neutral-900">
                {PLANS[currentPlan as keyof typeof PLANS].name}
              </p>
              <p className="text-sm text-neutral-600 mt-1">
                {company.subscription_status === 'active' ? (
                  <span className="text-green-600 font-medium">✓ Active</span>
                ) : company.subscription_status === 'past_due' ? (
                  <span className="text-red-600 font-medium">⚠ Payment Past Due</span>
                ) : company.subscription_status === 'canceled' ? (
                  <span className="text-yellow-600 font-medium">Canceled (expires {expirationDate})</span>
                ) : (
                  <span className="text-neutral-500">Inactive</span>
                )}
              </p>
              {expirationDate && company.subscription_status === 'active' && (
                <p className="text-xs text-neutral-500 mt-1">
                  Renews on {expirationDate}
                </p>
              )}
              {trialDays !== null && trialDays > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  🎉 Free trial: {trialDays} days remaining
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-neutral-900">
                ${PLANS[currentPlan as keyof typeof PLANS].price}
              </p>
              <p className="text-sm text-neutral-600">/month</p>
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([planKey, plan]) => {
            const isCurrentPlan = planKey === currentPlan
            const isUpgrade = 
              (currentPlan === 'basic' && planKey !== 'basic') ||
              (currentPlan === 'pro' && planKey === 'premium')
            const isDowngrade = 
              (currentPlan === 'premium' && planKey !== 'premium') ||
              (currentPlan === 'pro' && planKey === 'basic')

            return (
              <div
                key={planKey}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                  isCurrentPlan ? 'border-blue-500' : 'border-neutral-200'
                }`}
              >
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-neutral-900">${plan.price}</span>
                    <span className="text-sm text-neutral-600 ml-1">/month</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-neutral-700">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <button
                  onClick={() => handleUpgrade(planKey)}
                  disabled={processing || isCurrentPlan}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    isCurrentPlan
                      ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                      : isUpgrade
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  {processing
                    ? 'Processing...'
                    : isCurrentPlan
                    ? 'Current Plan'
                    : isUpgrade
                    ? `Upgrade to ${plan.name}`
                    : `Switch to ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-neutral-50 rounded-lg p-6 border border-neutral-200">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3">💡 Good to Know</h3>
          <ul className="space-y-2 text-sm text-neutral-700">
            <li>• Subscriptions can be upgraded or downgraded at any time</li>
            <li>• Downgrades take effect at the end of your current billing period</li>
            <li>• All payments are processed securely through Stripe</li>
            <li>• Cancel anytime - no long-term contracts required</li>
            <li>• Need help? Contact support at support@stackdek.com</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  )
}
