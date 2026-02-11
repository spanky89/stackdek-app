import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

export function useEnsureCompany() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Try to get existing company
        let { data: company, error: selectErr } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single()

        // If company doesn't exist, create it
        if (!company && selectErr?.code === 'PGRST116') {
          const { data: newCompany, error: insertErr } = await supabase
            .from('companies')
            .insert({ owner_id: user.id, name: 'My Company' })
            .select('id')
            .single()

          if (insertErr) {
            setError(insertErr.message)
            setLoading(false)
            return
          }
          company = newCompany
        } else if (selectErr) {
          setError(selectErr.message)
          setLoading(false)
          return
        }

        setCompanyId(company?.id ?? null)
      } catch (e: any) {
        setError(e?.message ?? 'Unknown error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return { companyId, error, loading }
}
