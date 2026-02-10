import { useParams, useNavigate } from 'react-router-dom'

export default function ClientProfilePage() {
  const { id } = useParams()
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-100 p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Client Profile</h1>
          <button
            onClick={() => nav('/home')}
            className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <p className="text-neutral-600">Client ID: {id}</p>
          <p className="text-neutral-600 mt-4">Client details coming soon...</p>
        </div>
      </div>
    </div>
  )
}
