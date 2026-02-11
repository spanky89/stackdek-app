import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CreateQuoteForm from '../components/CreateQuoteForm'

export default function CreateQuotePage() {
  const nav = useNavigate()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav('/quotes')} className="text-neutral-700 text-2xl leading-none">←</button>
          <span className="font-semibold text-lg">New Quote</span>
        </div>
        <CreateQuoteForm onSuccess={() => nav('/quotes')} />
      </div>
    </AppLayout>
  )
}
