import Header from './Header'
import BottomMenu from './BottomMenu'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <div className="flex-1 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Header />
          {children}
        </div>
      </div>
      <BottomMenu />
    </div>
  )
}
