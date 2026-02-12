import Header from './Header'
import BottomMenu from './BottomMenu'

interface AppLayoutProps {
  children: React.ReactNode
  onNewTask?: () => void
}

export default function AppLayout({ children, onNewTask }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="flex-1 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Header />
          {children}
        </div>
      </div>
      <BottomMenu onNewTask={onNewTask} />
    </div>
  )
}
