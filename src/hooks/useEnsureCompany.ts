import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

export function useEnsureCompany() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (isMounted) {
            setError('Not authenticated')
            setLoading(false)
          }
          return
        }

        // Get or create company
        const { data: companies, error: fetchErr } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (fetchErr && fetchErr.code !== 'PGRST116') {
          if (isMounted) {
            setError(fetchErr.message)
            setLoading(false)
          }
          return
        }

        let companyId: string | null = null

        if (companies && companies.length > 0) {
          companyId = companies[0].id
          console.log('Using existing company:', companyId)
        } else {
          // Create company only if none exists
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
          companyId = newCompany?.id ?? null
          console.log('Created new company:', companyId)
        }

        if (isMounted) {
          setCompanyId(companyId)
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

  return { companyId, error, loading }
}
