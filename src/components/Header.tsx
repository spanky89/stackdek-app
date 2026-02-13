import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../api/supabaseClient'

export default function Header({ showSignOut = true }: { showSignOut?: boolean }) {
  const nav = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  const menuItems = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Jobs', icon: '📋', path: '/jobs' },
    { label: 'Quotes', icon: '📝', path: '/quotes' },
    { label: 'Invoices', icon: '💰', path: '/invoices' },
    { label: 'Clients', icon: '👥', path: '/clients' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        {/* Search Bar (Desktop) */}
        {showSignOut && (
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
            <input 
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu (Mobile) */}
          {showSignOut && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition text-lg"
              title="Menu"
            >
              ☰
            </button>
          )}

          {showSignOut && (
            <>
              <button 
                onClick={() => nav('/settings')}
                className="hidden sm:inline text-sm px-3 py-1.5 text-neutral-600 hover:text-neutral-900 transition"
                title="Settings"
              >
                ⚙️
              </button>
              <button onClick={signOut} className="hidden sm:inline text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {showSignOut && mobileMenuOpen && (
        <div className="sm:hidden mb-4 bg-white rounded-lg border border-neutral-200 p-2 space-y-1">
          {/* Mobile Search */}
          <div className="px-2 py-2 border-b border-neutral-200 mb-2">
            <input 
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 rounded text-sm border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Menu Items */}
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => {
                nav(item.path)
                setMobileMenuOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                location.pathname === item.path
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div className="border-t border-neutral-200 pt-2 mt-2 space-y-1">
            <button onClick={signOut} className="w-full text-left px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50 transition">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
