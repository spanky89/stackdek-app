import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-neutral-900">StackDek</span>
          <button onClick={signOut} className="text-sm px-3 py-1.5 border border-neutral-200 rounded-lg">
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-40">
        <div className="max-w-2xl mx-auto h-16 grid grid-cols-3">
          <button onClick={() => nav('/employee-dashboard')} className="text-sm font-medium">Today</button>
          <button onClick={() => nav('/employee-dashboard#jobs')} className="text-sm font-medium">My Jobs</button>
          <button onClick={() => nav('/employee-dashboard#history')} className="text-sm font-medium">Time History</button>
        </div>
      </nav>
    </div>
  )
}
