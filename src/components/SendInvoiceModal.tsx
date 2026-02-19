import { useState } from 'react'
import { supabase } from '../api/supabaseClient'
import SendViaTextModal from './SendViaTextModal'

type SendInvoiceModalProps = {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  jobTitle: string | null
  totalAmount: number
  invoiceToken: string | null
  onClose: () => void
  onSent: () => void
}

export default function SendInvoiceModal({
  invoiceId,
  invoiceNumber,
  clientName,
  clientEmail,
  clientPhone,
  jobTitle,
  totalAmount,
  invoiceToken,
  onClose,
  onSent,
}: SendInvoiceModalProps) {
  const [loading, setLoading] = useState(false)
  const [showTextModal, setShowTextModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ensure invoice has token
  async function ensureToken(): Promise<string> {
    if (invoiceToken) return invoiceToken

    // Generate token if missing
    const { data, error: tokenErr } = await supabase
      .from('invoices')
      .update({ invoice_token: crypto.randomUUID() })
      .eq('id', invoiceId)
      .select('invoice_token')
      .single()

    if (tokenErr) throw new Error('Failed to generate invoice token')
    return data.invoice_token
  }

  async function handleEmailSend() {
    setLoading(true)
    setError(null)

    try {
      // Get business info for email
      const { data: userData } = await supabase.auth.getUser()
      const { data: companyData } = await supabase
        .from('companies')
        .select('business_name')
        .eq('user_id', userData?.user?.id)
        .single()

      const businessName = companyData?.business_name || 'Your Business'

      // Ensure token exists
      const token = await ensureToken()

      // Generate public link
      const publicLink = `https://stackdek-app.vercel.app/invoice/public/${token}`

      // Prepare email
      const subject = `Invoice from ${businessName}`
      const body = `Hi ${clientName},\n\nYour invoice ${invoiceNumber} for ${jobTitle || 'your service'} is ready.\n\nTotal: $${totalAmount.toLocaleString()}\n\nView invoice: ${publicLink}\n\nThank you!`

      // Open mailto link
      window.location.href = `mailto:${clientEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      // Show success and close
      setTimeout(() => {
        onSent()
        onClose()
      }, 500)
    } catch (e: any) {
      setError(e?.message || 'Failed to prepare email')
    } finally {
      setLoading(false)
    }
  }

  async function handleTextSend() {
    setLoading(true)
    setError(null)

    try {
      // Ensure token exists before opening text modal
      await ensureToken()
      setShowTextModal(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to prepare SMS')
    } finally {
      setLoading(false)
    }
  }

  if (showTextModal) {
    return (
      <SendViaTextModal
        invoiceNumber={invoiceNumber}
        clientName={clientName}
        clientPhone={clientPhone || ''}
        jobTitle={jobTitle}
        totalAmount={totalAmount}
        invoiceToken={invoiceToken!}
        onClose={() => {
          setShowTextModal(false)
          onClose()
        }}
        onSent={onSent}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Send Invoice to {clientName}</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          {/* Email Button */}
          <button
            onClick={handleEmailSend}
            disabled={loading || !clientEmail}
            className="w-full px-6 py-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {loading ? 'Preparing...' : 'Send via Email'}
          </button>
          {!clientEmail && (
            <p className="text-xs text-red-600 text-center">No email on file for this client</p>
          )}

          {/* Text Button */}
          <button
            onClick={handleTextSend}
            disabled={loading || !clientPhone}
            className="w-full px-6 py-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {loading ? 'Preparing...' : 'Send via Text'}
          </button>
          {!clientPhone && (
            <p className="text-xs text-red-600 text-center">No phone number on file for this client</p>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          className="w-full px-4 py-2 text-neutral-600 hover:text-neutral-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
