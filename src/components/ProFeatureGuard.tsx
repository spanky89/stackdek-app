import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from './AppLayout'
import { useSubscription } from '../hooks/useSubscription'

export default function ProFeatureGuard({ children }: { children: ReactNode }) {
  const { isPro, loading } = useSubscription()

  if (loading) {
    return <AppLayout><div className="py-20 text-center text-neutral-600">Checking plan…</div></AppLayout>
  }

  if (!isPro) {
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto mt-12 bg-white border border-neutral-200 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Pro feature</h1>
          <p className="mt-3 text-neutral-600">
            Team management and job costing require an active StackDek Pro subscription.
          </p>
          <Link
            to="/settings/billing"
            className="inline-block mt-6 px-5 py-2.5 bg-neutral-900 text-white rounded-lg font-medium"
          >
            View Pro plan
          </Link>
        </div>
      </AppLayout>
    )
  }

  return <>{children}</>
}
