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
      nav('/home', { replace: true })
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

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo & Tagline */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img src="/logo-transparent.png" alt="StackDek" className="h-36 w-auto" />
          </div>
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

            {/* OAuth Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}
