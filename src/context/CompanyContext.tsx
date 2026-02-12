import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../api/supabaseClient'

interface CompanyContextType {
  companyId: string | null
  loading: boolean
  error: string | null
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        // Use getSession() instead of getUser() for better reliability
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          if (isMounted) {
            setError('Not authenticated')
            setLoading(false)
          }
          return
        }
        const user = session.user

        // Get existing company (should only be one now)
        const { data: companies, error: fetchErr } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (fetchErr) {
          if (isMounted) {
            setError(fetchErr.message)
            setLoading(false)
          }
          return
        }

        if (companies && companies.length > 0) {
          if (isMounted) {
            setCompanyId(companies[0].id)
            console.log('Company loaded:', companies[0].id)
          }
        } else {
          // Only create if none exists
          const { data: newCompany, error: insertErr } = await supabase
            .from('companies')
            .insert({ owner_id: user.id, name: 'My Company' })
            .select('id')
            .single()

          if (insertErr) {
            if (isMounted) {
              setError(insertErr.message)
              setLoading(false)
            }
            return
          }

          if (isMounted) {
            setCompanyId(newCompany?.id ?? null)
            console.log('Company created:', newCompany?.id)
          }
        }

        if (isMounted) {
          setError(null)
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e?.message ?? 'Unknown error')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <CompanyContext.Provider value={{ companyId, loading, error }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider')
  }
  return context
}
