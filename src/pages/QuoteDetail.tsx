import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; client_id: string | null
  clients: { id: string; name: string } | null
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('quotes').select('*, clients(id, name)').eq('id', id).single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  async function updateStatus(newStatus: string) {
    setBusy(true)
    const { error: upErr } = await supabase.from('quotes').update({ status: newStatus }).eq('id', id)
    setBusy(false)
    if (upErr) { setError(upErr.message); return }
    setQuote({ ...quote!, status: newStatus })
  }

  function copyShareableLink() {
    const shareUrl = `${window.location.origin}/quotes/view/${id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!quote) return <div className="p-6">Quote not found.</div>

  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-800',
    sent: 'bg-neutral-100 text-neutral-800',
    accepted: 'bg-neutral-100 text-neutral-800',
    declined: 'bg-neutral-100 text-neutral-800',
    expired: 'bg-neutral-100 text-neutral-800',
  }

  return (
    <AppLayout>
      <>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Quote Detail</h1>
          <button onClick={() => nav('/quotes')} className="text-sm px-3 py-1.5 bg-white border border-neutral-200 rounded-lg">Back</button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">{quote.title}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>{quote.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => nav(`/quote/${id}/edit`)} className="text-sm px-3 py-1.5 bg-neutral-900 text-white rounded-lg">Edit</button>
              <p className="text-2xl font-bold">${quote.amount.toLocaleString()}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-neutral-600 mb-6">
            {quote.clients && <p>Client: <span className="text-blue-600 cursor-pointer" onClick={() => nav(`/client/${quote.clients!.id}`)}>{quote.clients.name}</span></p>}
            <p>Expiration: {quote.expiration_date ? new Date(quote.expiration_date).toLocaleDateString() : 'None'}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => updateStatus('accepted')} disabled={busy || quote.status === 'accepted'}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-40">Accept Quote</button>
            <button onClick={() => updateStatus('declined')} disabled={busy || quote.status === 'declined'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-40">Decline Quote</button>
            <button onClick={() => updateStatus('expired')} disabled={busy || quote.status === 'expired'}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm disabled:opacity-40">Mark Expired</button>
          </div>

          {/* Share Quote Section */}
          <div className="border-t border-neutral-200 pt-6">
            <h3 className="text-sm font-semibold mb-3">Share Quote</h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={`${window.location.origin}/quotes/view/${id}`}
                readOnly
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-600 bg-neutral-50"
              />
              <button 
                onClick={copyShareableLink}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Share this link with your client to view the quote</p>
          </div>
        </div>
      </>
    </AppLayout>
  )
}
