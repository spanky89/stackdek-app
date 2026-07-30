import { createContext, useContext, ReactNode } from 'react'
import { useAccess } from './AccessContext'

interface CompanyContextType {
  companyId: string | null
  loading: boolean
  error: string | null
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { companyId, loading, error } = useAccess()

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
