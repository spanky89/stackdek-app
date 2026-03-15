import { useState, useEffect } from 'react'
import { supabase } from '../api/supabaseClient'
import { seedDemoData } from '../utils/seedDemoData'

export function useDemoMode(companyId: string | null) {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    async function checkAndSeedDemo() {
      try {
        // Get company info
        const { data: company } = await supabase
          .from('companies')
          .select('id, is_demo_mode')
          .eq('id', companyId)
          .single()

        if (!company) {
          setLoading(false)
          return
        }

        setIsDemoMode(company.is_demo_mode || false)

        // If already in demo mode, we're done
        if (company.is_demo_mode) {
          setLoading(false)
          return
        }

        // Check if company has any existing data
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)

        const { count: jobCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)

        // If completely empty, seed demo data
        if (clientCount === 0 && jobCount === 0) {
          console.log('🌱 Seeding demo data for new company...')
          const result = await seedDemoData(companyId)
          
          if (result.success) {
            setIsDemoMode(true)
            console.log('✅ Demo data seeded successfully')
          } else {
            console.error('❌ Failed to seed demo data:', result.error)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error checking demo mode:', error)
        setLoading(false)
      }
    }

    checkAndSeedDemo()
  }, [companyId])

  return { isDemoMode, loading }
}
