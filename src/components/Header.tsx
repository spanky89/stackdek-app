import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

export default function Header({ showSignOut = true }: { showSignOut?: boolean }) {
  const nav = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => nav('/home')}>
        <img src="/logo-symbol.png" alt="StackDek" className="h-8 w-auto" />
        <span className="text-2xl font-bold tracking-tight">StackDek</span>
      </div>
      {showSignOut && (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => nav('/settings')}
            className="text-sm px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition"
            title="Settings"
          >
            ⚙️
          </button>
          <button onClick={signOut} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
