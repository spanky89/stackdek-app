import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type AcceptanceState = 'checking' | 'signin' | 'accepting' | 'success' | 'error'

export default function AcceptTeamInvitation() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [state, setState] = useState<AcceptanceState>('checking')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function acceptInvitation() {
      if (!token) {
        setError('This invitation link is incomplete.')
        setState('error')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (!session) {
        setState('signin')
        return
      }

      setState('accepting')
      const { error: acceptError } = await supabase
        .rpc('accept_team_invitation', { p_token: token })

      if (!mounted) return

      if (acceptError) {
        setError(acceptError.message || 'This invitation could not be accepted.')
        setState('error')
        return
      }

      setState('success')
      // Reload once so the shared access provider resolves the newly-created
      // membership instead of retaining the pre-acceptance owner fallback.
      window.setTimeout(() => window.location.assign('/employee-dashboard'), 1200)
    }

    acceptInvitation()
    return () => { mounted = false }
  }, [nav, token])

  const returnPath = `/accept-invite?token=${encodeURIComponent(token)}`

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-sm p-8 text-center">
        <img src="/logo-transparent.png" alt="StackDek" className="h-24 w-auto mx-auto mb-4" />

        {(state === 'checking' || state === 'accepting') && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-900">
              {state === 'checking' ? 'Checking invitation…' : 'Joining your team…'}
            </h1>
          </>
        )}

        {state === 'signin' && (
          <>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Sign in to join your team</h1>
            <p className="text-sm text-neutral-600 mb-6">
              Use the email address this invitation was sent to. You can create an account on the next screen if needed.
            </p>
            <button
              onClick={() => nav(`/login?next=${encodeURIComponent(returnPath)}`)}
              className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-lg"
            >
              Sign in or create account
            </button>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">You’re on the team</h1>
            <p className="text-sm text-neutral-600">Opening your employee dashboard…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Invitation unavailable</h1>
            <p className="text-sm text-red-700 mb-6">{error}</p>
            <p className="text-xs text-neutral-500">
              Ask the company owner to create a new invitation if this link expired or was already used.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
