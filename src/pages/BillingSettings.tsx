import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

interface Company {
  id: string
  name: string
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'none'
  subscription_plan: 'basic' | 'pro' | 'enterprise'
  subscription_current_period_end: string | null
  trial_ends_at: string | null
}

interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
  recommended?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_BASIC || 'price_basic',
    features: [
      'Up to 50 quotes/month',
      'Up to 25 jobs/month',
      'Basic client management',
      'Email support',
      'Accept payments (your Stripe)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_PRO || 'price_pro',
    recommended: true,
    features: [
      'Unlimited quotes',
      'Unlimited jobs',
      'Advanced client management',
      'Priority email support',
      'Accept payments (your Stripe)',
      'Custom branding',
      'Reporting & analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    stripePriceId: process.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
    features: [
      'Everything in Pro',
      'Multi-user accounts',
      'API access',
      'White-label options',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
]

export default function BillingSettings() {
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchCompany()
  }, [])

  async function fetchCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      setCompany(company)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(plan: Plan) {
    if (!company) return

    setProcessing(true)
    setMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMessage('❌ Not authenticated')
        setProcessing(false)
        return
      }

      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create checkout')
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`)
      setProcessing(false)
    }
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { color: string; text: string }> = {
      trial: { color: 'bg-blue-100 text-blue-800', text: '🎁 Trial' },
      active: { color: 'bg-green-100 text-green-800', text: '✓ Active' },
      past_due: { color: 'bg-yellow-100 text-yellow-800', text: '⚠ Past Due' },
      canceled: { color: 'bg-red-100 text-red-800', text: '✕ Canceled' },
      none: { color: 'bg-neutral-100 text-neutral-800', text: 'No Subscription' },
    }
    const badge = badges[status] || badges.none
    return (
      <span className={`text-xs px-3 py-1 rounded-full font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  function getDaysRemaining(endDate: string | null): number | null {
    if (!endDate) return null
    const end = new Date(endDate)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <p>Loading…</p>
      </div>
    )
  }

  if (!company) {
    return <div className="p-6">Company not found</div>
  }

  const trialDays = getDaysRemaining(company.trial_ends_at)
  const periodDays = getDaysRemaining(company.subscription_current_period_end)

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Subscription & Billing</h1>
          <button
            onClick={() => nav('/settings')}
            className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
          >
            ← Back to Settings
          </button>
        </div>

        {/* Current Subscription Status */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Subscription</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold capitalize">{company.subscription_plan}</span>
                {getStatusBadge(company.subscription_status)}
              </div>
              {company.subscription_status === 'trial' && trialDays !== null && (
                <p className="text-sm text-neutral-600">
                  {trialDays > 0 ? `${trialDays} days remaining in trial` : 'Trial expired'}
                </p>
              )}
              {company.subscription_status === 'active' && periodDays !== null && (
                <p className="text-sm text-neutral-600">
                  Renews in {periodDays} days
                  {company.subscription_current_period_end && (
                    <> ({new Date(company.subscription_current_period_end).toLocaleDateString()})</>
                  )}
                </p>
              )}
              {company.subscription_status === 'past_due' && (
                <p className="text-sm text-yellow-700 font-medium">
                  ⚠️ Payment failed. Please update your payment method.
                </p>
              )}
              {company.subscription_status === 'canceled' && (
                <p className="text-sm text-red-700">
                  Subscription canceled. Reactivate to continue using StackDek.
                </p>
              )}
            </div>
            {company.subscription_status === 'active' && (
              <div className="text-right">
                <p className="text-2xl font-bold">
                  ${PLANS.find(p => p.id === company.subscription_plan)?.price || 0}
                </p>
                <p className="text-sm text-neutral-600">/month</p>
              </div>
            )}
          </div>
        </div>

        {/* Trial Warning */}
        {company.subscription_status === 'trial' && trialDays !== null && trialDays <= 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>⏰ Your trial ends in {trialDays} {trialDays === 1 ? 'day' : 'days'}!</strong>
              <br />
              Choose a plan below to continue using StackDek.
            </p>
          </div>
        )}

        {/* Plan Selection */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg border-2 p-6 relative ${
                  plan.recommended
                    ? 'border-neutral-900 shadow-lg'
                    : 'border-neutral-200'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-neutral-900 text-white text-xs px-3 py-1 rounded-full font-medium">
                      Recommended
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-neutral-600">/{plan.interval}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={
                    processing ||
                    (company.subscription_plan === plan.id &&
                      company.subscription_status === 'active')
                  }
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    company.subscription_plan === plan.id &&
                    company.subscription_status === 'active'
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : plan.recommended
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200'
                  }`}
                >
                  {company.subscription_plan === plan.id &&
                  company.subscription_status === 'active'
                    ? 'Current Plan'
                    : processing
                    ? 'Processing...'
                    : company.subscription_status === 'trial'
                    ? 'Start Plan'
                    : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{message}</p>
          </div>
        )}

        {/* FAQ / Info */}
        <div className="mt-8 bg-neutral-50 rounded-lg border border-neutral-200 p-6">
          <h3 className="text-sm font-semibold mb-3">💡 Billing Information</h3>
          <ul className="text-sm text-neutral-700 space-y-2">
            <li>• All plans are billed monthly and can be canceled anytime</li>
            <li>• You can upgrade or downgrade at any time</li>
            <li>• Your payment method is securely stored with Stripe</li>
            <li>• Need help? Contact support@stackdek.com</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  )
}
