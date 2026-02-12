import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function RequestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

interface BottomMenuProps {
  onNewTask?: () => void
  onNewRequest?: () => void
}

export default function BottomMenu({ onNewTask, onNewRequest }: BottomMenuProps) {
  const nav = useNavigate()
  const loc = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isHome = loc.pathname === '/home'

  const isActive = (path: string) => {
    if (path === '/home') return loc.pathname === '/home'
    if (path === '/jobs') return loc.pathname.startsWith('/job')
    if (path === '/quotes') return loc.pathname.startsWith('/quote')
    if (path === '/clients') return loc.pathname.startsWith('/client')
    if (path === '/invoices') return loc.pathname.startsWith('/invoice')
    return loc.pathname === path
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const leftItems = [
    { Icon: HomeIcon, label: 'Home', path: '/home' },
    { Icon: BriefcaseIcon, label: 'Jobs', path: '/jobs' },
  ]

  const rightItems = [
    { Icon: UsersIcon, label: 'Clients', path: '/clients' },
    { Icon: DollarIcon, label: 'Invoices', path: '/invoices' },
  ]

  const quickActions = [
    { label: 'New Request', action: 'newRequest', Icon: RequestIcon },
    { label: 'New Invoice', path: '/invoices/create', Icon: CreditCardIcon },
    { label: 'Add Client', path: '/clients/create', Icon: UserPlusIcon },
    { label: 'New Quote', path: '/quotes/create', Icon: FileTextIcon },
    { label: 'New Task', action: 'newTask', Icon: ClipboardIcon },
  ]

  const renderItem = ({ Icon, label, path }: { Icon: React.FC<{ className?: string }>; label: string; path: string }) => (
    <button
      key={path}
      onClick={() => nav(path)}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 transition-colors ${
        isActive(path) ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'
      }`}
      title={label}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {leftItems.map(renderItem)}

        {/* Center + button — raised above bar like mockup */}
        <div className="relative flex flex-col items-center" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 w-44">
              {quickActions.map((action: any) => (
                <button
                  key={action.path || action.action}
                  onClick={() => {
                    setMenuOpen(false)
                    if (action.action === 'newTask') {
                      onNewTask?.()
                    } else if (action.action === 'newRequest') {
                      onNewRequest?.()
                    } else {
                      nav(action.path)
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <action.Icon className="w-4 h-4 text-neutral-500" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex items-center justify-center w-12 h-12 -mt-6 rounded-full shadow-md transition-all ${
              menuOpen
                ? 'bg-neutral-800 text-white rotate-45'
                : 'bg-neutral-900 text-white'
            }`}
            title="Quick Actions"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  )
}
