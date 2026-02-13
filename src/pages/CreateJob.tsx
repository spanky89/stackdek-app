import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import CreateJobForm from '../components/CreateJobForm'

export default function CreateJobPage() {
  const nav = useNavigate()

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => nav('/jobs')} className="text-neutral-700 text-2xl leading-none">←</button>
          <span className="font-semibold text-lg">New Job</span>
        </div>
        <CreateJobForm onSuccess={() => nav('/jobs')} />
      </div>
    </AppLayout>
  )
}
