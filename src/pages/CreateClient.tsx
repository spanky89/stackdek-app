import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CreateClientForm from '../components/CreateClientForm'

export default function CreateClientPage() {
  const nav = useNavigate()

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav('/clients')} className="text-neutral-700 text-2xl leading-none">←</button>
          <span className="font-semibold text-lg">New Client</span>
        </div>
        <CreateClientForm onSuccess={() => nav('/clients')} />
      </div>
    </AppLayout>
  )
}
