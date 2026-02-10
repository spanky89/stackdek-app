import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { useNavigate } from 'react-router-dom'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LandingPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)

    if (!EMAIL_RE.test(email)) { setErr('Please enter a valid email address.'); return }
    if (password.length < 8) { setErr('Password must be at least 8 characters.'); return }

    setBusy(true)
    try {
      // 1. Create Supabase auth account
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setErr(error.message); return }

      // 2. Store in signups table
      const { error: insertErr } = await supabase.from('signups').insert({
        email,
        company_name: company.trim() || null,
        user_id: data.user?.id ?? null,
      })
      if (insertErr) console.warn('signups insert failed:', insertErr.message)

      setSuccess(true)
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-12">
          <img src="/logo-transparent.png" alt="StackDek" className="h-16 mx-auto mb-4" />
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            StackDek
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">
            The all-in-one platform for contractors. Manage jobs, clients, quotes, and invoices — all from one dashboard. Built to save you time and get you paid faster.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-neutral-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full" /> Job Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-blue-500 rounded-full" /> Quotes & Invoices
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Client Management
            </span>
          </div>
        </div>

        {/* Signup Card */}
        <div className="max-w-md mx-auto">
          {success ? (
            <div className="bg-white rounded-2xl shadow border border-neutral-200 p-8 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">Check your email to confirm your account</h2>
              <p className="text-sm text-neutral-600 mb-6">
                We sent a confirmation link to <span className="font-medium text-neutral-700">{email}</span>. Click it to activate your account.
              </p>
              <button
                onClick={() => nav('/login')}
                className="text-sm text-blue-600 hover:underline"
              >
                Already confirmed? Sign in →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow border border-neutral-200 p-8">
              <h2 className="text-xl font-bold mb-1">Create your account</h2>
              <p className="text-sm text-neutral-600 mb-6">Free to get started. No credit card required.</p>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company name <span className="text-neutral-400 font-normal">(optional)</span></label>
                  <input
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 outline-none"
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="Acme Contracting"
                  />
                </div>

                {err && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{err}</p>}

                <button
                  className="w-full bg-neutral-900 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60 hover:bg-neutral-800 transition-colors"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-neutral-600 mt-6">
                Already have an account?{' '}
                <button onClick={() => nav('/login')} className="text-blue-600 hover:underline font-medium">
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
