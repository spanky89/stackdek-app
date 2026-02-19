import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../api/supabaseClient'
import { useCompany } from '../context/CompanyContext'

type SearchResult = { id: string; type: 'client' | 'request' | 'quote' | 'job' | 'invoice'; name: string; details?: string }

export default function Header({ showSignOut = true }: { showSignOut?: boolean }) {
  const nav = useNavigate()
  const location = useLocation()
  const { companyId } = useCompany()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    nav('/login', { replace: true })
  }

  async function performSearch(query: string) {
    if (!query.trim() || !companyId) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results: SearchResult[] = []

      // Search clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', `%${query}%`)
        .limit(5)
      
      if (clients) {
        results.push(...clients.map(c => ({ id: c.id, type: 'client' as const, name: c.name })))
      }

      // Search requests
      const { data: requests } = await supabase
        .from('requests')
        .select('id, client_name')
        .eq('company_id', companyId)
        .ilike('client_name', `%${query}%`)
        .limit(5)
      
      if (requests) {
        results.push(...requests.map(r => ({ id: r.id, type: 'request' as const, name: `Request from ${r.client_name}` })))
      }

      // Search quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, title')
        .eq('company_id', companyId)
        .ilike('title', `%${query}%`)
        .limit(5)
      
      if (quotes) {
        results.push(...quotes.map(q => ({ id: q.id, type: 'quote' as const, name: q.title })))
      }

      // Search jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('company_id', companyId)
        .ilike('title', `%${query}%`)
        .limit(5)
      
      if (jobs) {
        results.push(...jobs.map(j => ({ id: j.id, type: 'job' as const, name: j.title })))
      }

      // Search invoices (by associated client or job)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('company_id', companyId)
        .ilike('invoice_number', `%${query}%`)
        .limit(5)
      
      if (invoices) {
        results.push(...invoices.map(inv => ({ id: inv.id, type: 'invoice' as const, name: `Invoice ${inv.invoice_number}` })))
      }

      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchResultClick = (result: SearchResult) => {
    const paths: Record<string, string> = {
      client: `/clients/${result.id}`,
      request: `/requests/${result.id}`,
      quote: `/quotes/${result.id}`,
      job: `/jobs/${result.id}`,
      invoice: `/invoices/${result.id}`,
    }
    nav(paths[result.type])
    setSearchOpen(false)
    setSearchQuery('')
  }

  const menuItems = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Jobs', icon: '📋', path: '/jobs' },
    { label: 'Requests', icon: '📬', path: '/requests' },
    { label: 'Quotes', icon: '📝', path: '/quotes' },
    { label: 'Invoices', icon: '💰', path: '/invoices' },
    { label: 'Clients', icon: '👥', path: '/clients' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        {/* Left: Hamburger + StackDek Text */}
        <div className="flex items-center gap-3">
          {showSignOut && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden px-2 py-1.5 text-neutral-900 hover:text-neutral-700 transition text-xl"
              title="Menu"
            >
              ☰
            </button>
          )}
          <span className="text-lg sm:text-xl font-bold text-neutral-900">StackDek</span>
        </div>

        {/* Center: Search Bar (Desktop) */}
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

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Search Icon (Mobile) */}
          {showSignOut && (
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="sm:hidden px-3 py-1.5 text-neutral-900 hover:text-neutral-700 transition text-lg"
              title="Search"
            >
              🔍
            </button>
          )}

          {showSignOut && (
            <>
              <button 
                onClick={() => nav('/settings')}
                className="hidden sm:inline text-sm px-3 py-1.5 text-neutral-900 hover:text-neutral-700 transition"
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

      {/* Search Modal (Mobile) */}
      {showSignOut && searchOpen && (
        <div className="sm:hidden mb-4 bg-white rounded-lg border border-neutral-200 p-3">
          <input 
            type="text"
            placeholder="Search clients, requests, quotes, jobs, invoices…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 mb-2"
          />
          {searching && <p className="text-xs text-neutral-500 px-3">Searching…</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map(result => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full text-left px-3 py-2 rounded text-sm hover:bg-neutral-100 transition text-neutral-900"
                >
                  {result.name}
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && !searching && (
            <p className="text-xs text-neutral-500 px-3">No results found</p>
          )}
        </div>
      )}

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
