import { useState } from 'react'

type SendViaTextModalProps = {
  invoiceNumber: string
  clientName: string
  clientPhone: string
  jobTitle: string | null
  totalAmount: number
  invoiceToken: string
  onClose: () => void
  onSent: () => void
}

export default function SendViaTextModal({
  invoiceNumber,
  clientName,
  clientPhone,
  jobTitle,
  totalAmount,
  invoiceToken,
  onClose,
  onSent,
}: SendViaTextModalProps) {
  const publicLink = `https://stackdek-app.vercel.app/invoice/public/${invoiceToken}`
  
  const defaultMessage = `Hi ${clientName}, your invoice ${invoiceNumber} for ${jobTitle || 'your service'} is ready. Total: $${totalAmount.toLocaleString()}. View here: ${publicLink}`

  const [message, setMessage] = useState(defaultMessage)

  function handleSendText() {
    // Use sms: deep link to open native messaging app
    const smsLink = `sms:${clientPhone}?body=${encodeURIComponent(message)}`
    window.location.href = smsLink

    // Show success and close after brief delay
    setTimeout(() => {
      onSent()
      onClose()
    }, 500)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <h2 className="text-xl font-bold mb-4">Send Text to {clientName}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Message (editable)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Edit your message..."
          />
          <p className="text-xs text-neutral-500 mt-1">
            To: {clientPhone}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSendText}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Open in Messages
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-800 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
