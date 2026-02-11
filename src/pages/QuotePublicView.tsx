import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

type Quote = {
  id: string
  title: string
  status: string
  amount: number
  expiration_date: string | null
  clients: { id: string; name: string } | null
  companies: { name: string; invoice_notes: string | null } | null
}

export default function QuotePublicViewPage() {
  const { id } = useParams<{ id: string }>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('quotes')
          .select('*, clients(id, name), companies(name, invoice_notes)')
          .eq('id', id)
          .single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-neutral-600">Loading quote…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-neutral-600">Quote not found.</div>
      </div>
    )
  }

  const isExpired = quote.expiration_date && new Date(quote.expiration_date) < new Date()
  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{quote.title}</h1>
              <p className="text-neutral-600 text-sm">{quote.companies?.name || 'Service Provider'}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold mb-2">${quote.amount.toLocaleString()}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm border-t border-neutral-200 pt-6">
            <div>
              <p className="text-neutral-600 mb-1">For</p>
              <p className="font-semibold">{quote.clients?.name || 'Client'}</p>
            </div>
            <div>
              <p className="text-neutral-600 mb-1">Valid Until</p>
              <p className="font-semibold">
                {quote.expiration_date 
                  ? new Date(quote.expiration_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })
                  : 'No expiration date'
                }
              </p>
              {isExpired && <p className="text-red-600 text-xs mt-1">❌ This quote has expired</p>}
            </div>
          </div>
        </div>

        {/* Terms */}
        {quote.companies?.invoice_notes && (
          <div className="bg-white rounded-lg border border-neutral-200 p-8 mb-6">
            <h2 className="text-sm font-semibold mb-3">Terms & Conditions</h2>
            <p className="text-sm text-neutral-700 whitespace-pre-wrap">{quote.companies.invoice_notes}</p>
          </div>
        )}

        {/* Status Message */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6 text-center">
          <p className="text-sm text-neutral-600">
            {quote.status === 'draft' && 'This quote is still being prepared.'}
            {quote.status === 'sent' && 'This quote is awaiting your response. Please contact us if you have any questions.'}
            {quote.status === 'accepted' && '✓ This quote has been accepted. Thank you!'}
            {quote.status === 'declined' && 'This quote has been declined.'}
            {isExpired && ' This quote has expired.'}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-neutral-500">
          <p>Powered by StackDek</p>
        </div>
      </div>
    </div>
  )
}
