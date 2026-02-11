import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

interface Company {
  id: string
  name: string
  email?: string
  phone?: string
}

type SubscriptionTier = 'free' | 'pro' | 'business'

export default function AccountPage() {
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Visa •••• 4242')
  const [editingPayment, setEditingPayment] = useState(false)
  const [newPaymentMethod, setNewPaymentMethod] = useState('')

  // Mock subscription data (in a real app, this would come from a subscriptions table)
  const [subscription] = useState({
    tier: 'pro' as SubscriptionTier,
    status: 'active',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    monthlyAmount: 49.99,
    amountDue: 0,
    features: ['Unlimited invoices', 'Unlimited clients', 'Custom branding', 'Priority support'],
  })

  useEffect(() => {
    fetchCompany()
  }, [])

  async function fetchCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let { data: company } = await supabase.from('companies').select('*').eq('owner_id', user.id).single()

      if (!company) {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({ owner_id: user.id, name: 'My Company' })
          .select()
          .single()
        company = newCompany
      }

      setCompany(company)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function updatePaymentMethod() {
    if (!newPaymentMethod.trim()) return
    setSaving(true)
    try {
      setPaymentMethod(newPaymentMethod)
      setEditingPayment(false)
      setNewPaymentMethod('')
      setMessage('✅ Payment method updated')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage('❌ Failed to update payment method')
    } finally {
      setSaving(false)
    }
  }

  async function cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) return
    setSaving(true)
    try {
      // In a real app, this would call a backend endpoint to cancel the subscription
      setMessage('✅ Subscription cancelled')
      setTimeout(() => setMessage(''), 2000)
    } catch (err) {
      setMessage('❌ Failed to cancel subscription')
    } finally {
      setSaving(false)
    }
  }

  const tierColors = {
    free: 'bg-gray-100 text-gray-800',
    pro: 'bg-blue-100 text-blue-800',
    business: 'bg-purple-100 text-purple-800',
  }

  const tierLabels = {
    free: 'Free Plan',
    pro: 'Pro Plan',
    business: 'Business Plan',
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!company) return <div className="p-6">Company not found</div>

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Account & Billing</h1>
          <button onClick={() => nav('/settings')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">
            Settings
          </button>
        </div>

        {/* Subscription Status */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Subscription</h2>
              <p className="text-sm text-neutral-600">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${tierColors[subscription.tier]}`}>
                  {tierLabels[subscription.tier]}
                </span>
                <span className="ml-2 text-green-600">● Active</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-600">Monthly billing</p>
              <p className="text-2xl font-bold">${subscription.monthlyAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-neutral-200 border-b">
            <div>
              <p className="text-xs text-neutral-600 mb-1">Next Billing Date</p>
              <p className="font-semibold">
                {subscription.nextBillingDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-600 mb-1">Amount Due</p>
              <p className="font-semibold">${subscription.amountDue.toFixed(2)}</p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-4">
            <p className="text-sm font-semibold mb-3">What's included:</p>
            <ul className="space-y-2">
              {subscription.features.map((feature, i) => (
                <li key={i} className="text-sm text-neutral-700 flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Subscription Actions */}
          <div className="flex gap-3 pt-6 border-t border-neutral-200 mt-6">
            <button
              onClick={() => nav('/')}
              className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition"
            >
              Upgrade Plan
            </button>
            <button
              onClick={cancelSubscription}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition disabled:opacity-50"
            >
              {saving ? 'Cancelling…' : 'Cancel Subscription'}
            </button>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Billing Information</h2>

          {/* Company Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Billing Name</label>
            <p className="text-neutral-900 text-sm">{company.name}</p>
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Billing Email</label>
            <p className="text-neutral-900 text-sm">{company.email || 'Not set'}</p>
          </div>

          {/* Payment Method */}
          <div className="mb-6 pb-6 border-b border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-neutral-700">Payment Method</label>
              <button
                onClick={() => setEditingPayment(!editingPayment)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {editingPayment ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {!editingPayment ? (
              <div className="bg-neutral-50 rounded-lg p-4 flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-semibold text-sm">{paymentMethod}</p>
                  <p className="text-xs text-neutral-600">Expires 12/2026</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter new payment method"
                  value={newPaymentMethod}
                  onChange={e => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <div className="flex gap-2">
                  <button
                    onClick={updatePaymentMethod}
                    disabled={saving || !newPaymentMethod.trim()}
                    className="flex-1 px-3 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPayment(false)
                      setNewPaymentMethod('')
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invoices */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Invoices & Receipts</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Invoice #SUB-0001</p>
                  <p className="text-sm text-neutral-600">Feb 11, 2026</p>
                </div>
                <p className="text-xs text-neutral-500">$49.99</p>
              </button>
            </div>
          </div>
        </div>

        {message && <p className="text-sm mt-4">{message}</p>}
      </div>
    </AppLayout>
  )
}
