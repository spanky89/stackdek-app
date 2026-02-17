import { useState, useEffect } from 'react'

type OnMyWayModalProps = {
  clientName: string
  clientPhone: string | null
  address: string | null
  onClose: () => void
}

export function OnMyWayModal({ clientName, clientPhone, address, onClose }: OnMyWayModalProps) {
  const [timeFrame, setTimeFrame] = useState('20 minutes')
  const [message, setMessage] = useState('')

  // Time frame options
  const timeOptions = [
    '10 minutes',
    '20 minutes',
    '30 minutes',
    '45 minutes',
    '1 hour',
  ]

  // Generate default message
  useEffect(() => {
    const locationText = address || 'your location'
    setMessage(`Hi ${clientName}, I'm on my way to ${locationText}. I'll be there in ${timeFrame}.`)
  }, [clientName, address, timeFrame])

  function handleSendMessage() {
    if (!clientPhone) {
      alert('No phone number on file for this client')
      return
    }

    // Open native Messages app with pre-filled text
    const smsUrl = `sms:${clientPhone}?body=${encodeURIComponent(message)}`
    window.location.href = smsUrl
    
    // Show toast (in real app, use a toast library)
    alert('Opening Messages app...')
    
    // Close modal
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Send ETA to {clientName}</h2>
        
        {/* Time Frame Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Time Frame
          </label>
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {timeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Message Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {/* Warning if no phone */}
        {!clientPhone && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ No phone number on file for this client
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!clientPhone}
            className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Open in Messages
          </button>
        </div>
      </div>
    </div>
  )
}
