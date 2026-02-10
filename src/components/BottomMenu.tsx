import { useNavigate, useLocation } from 'react-router-dom'

export default function BottomMenu() {
  const nav = useNavigate()
  const loc = useLocation()

  const isActive = (path: string) => {
    if (path === '/home') return loc.pathname === '/home'
    if (path === '/jobs') return loc.pathname.startsWith('/job')
    if (path === '/quotes') return loc.pathname.startsWith('/quote')
    if (path === '/clients') return loc.pathname.startsWith('/client')
    if (path === '/invoices') return loc.pathname.startsWith('/invoice')
    return loc.pathname === path
  }

  const menuItems = [
    { icon: '🏠', label: 'Home', path: '/home' },
    { icon: '📋', label: 'Jobs', path: '/jobs' },
    { icon: '📝', label: 'Quotes', path: '/quotes' },
    { icon: '👥', label: 'Clients', path: '/clients' },
    { icon: '📊', label: 'Invoices', path: '/invoices' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 z-40">
      <div className="flex justify-around items-center h-16 max-w-full px-4">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => nav(item.path)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-4 transition ${
              isActive(item.path)
                ? 'text-neutral-900'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
            title={item.label}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
