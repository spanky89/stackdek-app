import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Create anon-only client for public form submission
const anonSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export default function RequestFormPublic() {
  const { companyId } = useParams<{ companyId: string }>()
  const isDemoMode = companyId === 'demo'
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isDemoMode) {
        // Demo mode - fake submission
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSubmitted(true)
      } else {
        // Real submission
        const { error: insertError } = await anonSupabase
          .from('requests')
          .insert({
            company_id: companyId,
            client_name: formData.clientName,
            client_email: formData.clientEmail || null,
            client_phone: formData.clientPhone || null,
            description: formData.description || null,
            status: 'pending'
          })

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(insertError.message)
        }

        setSubmitted(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Request Submitted!</h1>
          <p className="text-neutral-600 mb-6">
            Thank you for your request. We'll get back to you shortly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setFormData({
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                description: ''
              })
            }}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {isDemoMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 font-medium">
              📋 Demo Mode - This is what your request form will look like when embedded on your website
            </p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Request a Service</h1>
          <p className="text-neutral-600 mb-8">
            Fill out the form below and we'll get back to you as soon as possible.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Your Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="John Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Project Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                placeholder="Tell us about your project..."
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !formData.clientName}
              className="w-full py-4 bg-neutral-900 text-white font-semibold rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          <p className="text-xs text-neutral-500 text-center mt-6">
            By submitting this form, you agree to be contacted about your service request.
          </p>

          <p className="text-xs text-neutral-400 text-center mt-4">
            Powered by{' '}
            <a 
              href="https://stackdek.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-900 underline"
            >
              StackDek
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
