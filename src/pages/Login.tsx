import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type AuthMode = 'signin' | 'signup'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const nav = useNavigate()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) throw err
      // Check session to ensure it's set before navigating
      await supabase.auth.getSession()
      nav('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    try {
      // 1. Create Supabase auth account
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authErr) throw authErr

      // 2. Store in signups table
      const { error: insertErr } = await supabase.from('signups').insert({
        email,
        company_name: company.trim() || null,
        user_id: data.user?.id ?? null,
      })
      if (insertErr) console.warn('signups insert failed:', insertErr.message)

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) throw err
    } catch (err: any) {
      setError(err.message || 'Google sign in failed')
      setLoading(false)
    }
  }

  async function handleAppleSignIn() {
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (err) throw err
    } catch (err: any) {
      setError(err.message || 'Apple sign in failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Tagline */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h9v9H3V3zm9-3h9v9h-9V0zm0 12h9v9h-9v-9zM0 12h9v9H0v-9z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">StackDek</h1>
          <p className="text-sm text-neutral-600">Built by contractors for contractors</p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
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
              onClick={() => {
                setSuccess(false)
                setMode('signin')
                setEmail('')
                setPassword('')
                setCompany('')
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Back to sign in →
            </button>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setMode('signin')}
                className={`flex-1 py-2.5 font-medium text-sm transition-colors ${
                  mode === 'signin'
                    ? 'bg-neutral-900 text-white rounded-lg'
                    : 'bg-white text-neutral-600 rounded-lg border border-neutral-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 font-medium text-sm transition-colors ${
                  mode === 'signup'
                    ? 'bg-neutral-900 text-white rounded-lg'
                    : 'bg-white text-neutral-600 rounded-lg border border-neutral-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4 mb-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
            <input
              type="password"
              placeholder={mode === 'signup' ? 'Min 8 characters' : 'Enter your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              disabled={loading}
              minLength={mode === 'signup' ? 8 : undefined}
            />
          </div>

          {/* Company name (Sign Up only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Company name <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Acme Contracting"
                value={company}
                onChange={e => setCompany(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                disabled={loading}
              />
            </div>
          )}

          {/* Remember me & Forgot password (Sign In only) */}
          {mode === 'signin' && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border border-neutral-200 rounded cursor-pointer"
                />
                <span className="text-neutral-600">Remember me</span>
              </label>
              <a href="#" className="text-neutral-600 hover:text-neutral-900">
                Forgot password?
              </a>
            </div>
          )}

          {/* Error Message */}
          {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? (mode === 'signin' ? 'Signing In…' : 'Creating Account…') : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

            {/* OAuth Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-neutral-50 text-neutral-600">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="14" fontWeight="bold">
                    G
                  </text>
                </svg>
                Google
              </button>
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                className="py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 13.5c-.91 0-1.72.54-2.1 1.34.77 1.23 1.2 2.64 1.2 4.16 0 .36-.03.71-.08 1.05 1.26-.7 2.15-1.98 2.15-3.48 0-2.13-1.73-3.87-3.87-3.87zm-1.4-8.8c.22 0 .43-.02.64-.06-1.04-1.08-2.5-1.75-4.14-1.75-3.31 0-6 2.69-6 6 0 2.34 1.35 4.36 3.3 5.34.24-.98.74-1.9 1.42-2.66-1.52-1.18-2.5-3.01-2.5-5.1 0-3.6 2.92-6.52 6.52-6.52 1.55 0 2.98.55 4.1 1.46.28-.05.55-.08.82-.08 2.13 0 3.87 1.73 3.87 3.87 0 .88-.3 1.7-.8 2.35 1.05-1.8 2.1-3.68 2.1-5.76 0-3.65-2.96-6.61-6.61-6.61z" />
                </svg>
                Apple
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
