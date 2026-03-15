import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import { clearDemoData } from '../utils/seedDemoData'

interface DemoBannerProps {
  companyId: string
  onClear?: () => void
}

export function DemoBanner({ companyId, onClear }: DemoBannerProps) {
  const [clearing, setClearing] = useState(false)

  const handleClearDemo = async () => {
    if (!confirm('This will delete all demo data. Are you sure?')) return

    setClearing(true)
    const result = await clearDemoData(companyId)
    
    if (result.success) {
      alert('Demo data cleared! Add your real jobs now.')
      if (onClear) onClear()
      window.location.reload()
    } else {
      alert('Error clearing demo data. Please try again.')
      setClearing(false)
    }
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👋</span>
          <div>
            <p className="font-semibold text-blue-900">This is demo data</p>
            <p className="text-sm text-blue-700">
              Explore StackDek with sample jobs and contacts. Click below when you're ready to add your real data.
            </p>
          </div>
        </div>
        <button
          onClick={handleClearDemo}
          disabled={clearing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {clearing ? 'Clearing...' : 'Clear Demo Data'}
        </button>
      </div>
    </div>
  )
}
