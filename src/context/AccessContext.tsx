import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../api/supabaseClient'
import { withTimeout } from '../utils/withTimeout'

type AccessState = {
  session: Session | null
  companyId: string | null
  role: string | null
  subscriptionValid: boolean
  loading: boolean
  error: string | null
}

const AccessContext = createContext<AccessState | undefined>(undefined)

function ownerSubscriptionIsValid(company: {
  subscription_status: string | null
  trial_ends_at: string | null
}) {
  if (company.subscription_status === 'active') return true
  return company.subscription_status === 'trial'
    && Boolean(company.trial_ends_at)
    && new Date(company.trial_ends_at as string) > new Date()
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState>({
    session: null,
    companyId: null,
    role: null,
    subscriptionValid: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true
    let requestId = 0
    let resolvingUserId: string | null = null

    function isAcceptingTeamInvitation() {
      if (window.location.pathname === '/accept-invite') return true
      if (window.location.pathname !== '/login') return false
      const next = new URLSearchParams(window.location.search).get('next')
      return next?.startsWith('/accept-invite') === true
    }

    async function resolveAccess(session: Session | null) {
      if (session && resolvingUserId === session.user.id) return
      const currentRequest = ++requestId

      if (!session) {
        if (mounted) {
          setState({
            session: null,
            companyId: null,
            role: null,
            subscriptionValid: false,
            loading: false,
            error: null,
          })
        }
        return
      }

      // getSession and SIGNED_IN can fire together. Only one resolver may
      // create an owner company for a user at a time.
      resolvingUserId = session.user.id

      setState(previous => ({
        ...previous,
        session,
        loading: true,
        error: null,
      }))

      try {
        const { data: membership, error: membershipError } = await withTimeout(
          supabase
            .from('team_members')
            .select('company_id, role')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
          10000,
          'StackDek could not verify your team access.',
        )
        if (membershipError) throw membershipError

        if (membership) {
          const { data: employeeAccess, error: accessError } = await withTimeout(
            supabase.rpc('company_has_active_pro', {
              p_company_id: membership.company_id,
            }),
            10000,
            'StackDek could not verify your company subscription.',
          )
          if (accessError) throw accessError

          if (mounted && currentRequest === requestId) {
            setState({
              session,
              companyId: membership.company_id,
              role: membership.role,
              subscriptionValid: employeeAccess === true,
              loading: false,
              error: null,
            })
          }
          return
        }

        // A newly signed-in invitee is linked to team_members by the
        // invitation page. Never create a blank owner company during that
        // short pre-acceptance window.
        if (isAcceptingTeamInvitation()) {
          if (mounted && currentRequest === requestId) {
            setState({
              session,
              companyId: null,
              role: null,
              subscriptionValid: false,
              loading: false,
              error: null,
            })
          }
          return
        }

        let { data: company, error: companyError } = await withTimeout(
          supabase
            .from('companies')
            .select('id, subscription_status, trial_ends_at')
            .eq('owner_id', session.user.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle(),
          10000,
          'StackDek could not load your company.',
        )
        if (companyError) throw companyError

        if (!company) {
          const { data: created, error: createError } = await withTimeout(
            supabase
              .from('companies')
              .upsert(
                { owner_id: session.user.id, name: 'My Company' },
                { onConflict: 'owner_id' },
              )
              .select('id, subscription_status, trial_ends_at')
              .single(),
            10000,
            'StackDek could not create your company.',
          )
          if (createError) throw createError
          company = created
        }

        if (mounted && currentRequest === requestId) {
          setState({
            session,
            companyId: company?.id ?? null,
            role: null,
            subscriptionValid: company ? ownerSubscriptionIsValid(company) : false,
            loading: false,
            error: null,
          })
        }
      } catch (error: any) {
        if (mounted && currentRequest === requestId) {
          setState({
            session,
            companyId: null,
            role: null,
            subscriptionValid: false,
            loading: false,
            error: error?.message ?? 'StackDek could not verify your access.',
          })
        }
      } finally {
        if (resolvingUserId === session.user.id) resolvingUserId = null
      }
    }

    void withTimeout(
      supabase.auth.getSession(),
      8000,
      'Your session could not be verified.',
    )
      .then(({ data }) => resolveAccess(data.session))
      .catch((error: any) => {
        if (mounted) {
          setState(previous => ({
            ...previous,
            loading: false,
            error: error?.message ?? 'Your session could not be verified.',
          }))
        }
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'TOKEN_REFRESHED') {
        setState(previous => ({ ...previous, session }))
        return
      }
      // Leave the auth callback before querying Supabase to avoid competing
      // with the client's internal session lock.
      window.setTimeout(() => void resolveAccess(session), 0)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  return <AccessContext.Provider value={state}>{children}</AccessContext.Provider>
}

export function useAccess() {
  const context = useContext(AccessContext)
  if (!context) throw new Error('useAccess must be used within AccessProvider')
  return context
}
