import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

export default function SetupPasswordPage() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')

  useEffect(() => {
    checkPasswordStatus()
  }, [])

  async function checkPasswordStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        nav('/login', { replace: true })
        return
      }

      setEmail(user.email || '')

      // Check if user already has a password
      // We can't directly check encrypted_password from client, 
      // so we check if they signed up with email provider
      const providers = user.app_metadata?.providers || []
      const hasEmailProvider = providers.includes('email')
      
      if (hasEmailProvider) {
        // User already has password, skip to home
        nav('/home', { replace: true })
        return
      }

      setChecking(false)
    } catch (err) {
      console.error('Error checking password status:', err)
      setChecking(false)
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Set password for OAuth user
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Success! Continue to home
      nav('/home', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Failed to set password')
      setLoading(false)
    }
  }

  async function handleSkip() {
    // Allow skipping, but they won't be able to use email/password login
    nav('/home', { replace: true })
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img src="/logo-transparent.png" alt="StackDek" className="h-36 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Set Up Your Password</h1>
          <p className="text-sm text-neutral-600">
            You signed up with Google. Create a password so you can also log in with email.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="bg-white rounded-lg border border-neutral-200 p-6 space-y-4">
          {/* Email Display */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <p className="text-sm text-neutral-600 mb-1">Account Email</p>
            <p className="text-sm font-medium text-neutral-900">{email}</p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Why set a password?</strong><br />
              You'll be able to log in using either Google OR email + password. This gives you backup access.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Create Password
            </label>
            <input
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              disabled={loading}
              required
              minLength={8}
            />
            <p className="text-xs text-neutral-500 mt-1">At least 8 characters</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              disabled={loading}
              required
              minLength={8}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-2.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {loading ? 'Setting Password...' : 'Continue to StackDek'}
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-sm text-neutral-600 hover:text-neutral-900"
          >
            Skip for now (not recommended)
          </button>
        </form>
      </div>
    </div>
  )
}
