import { useState } from 'react'
import SignatureCanvas from './SignatureCanvas'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSign: (signature: string, name: string) => void
  quoteName?: string
}

export default function SignatureModal({ isOpen, onClose, onSign, quoteName }: SignatureModalProps) {
  const [signature, setSignature] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  if (!isOpen) return null

  const handleSign = () => {
    if (!signature) {
      alert('Please draw your signature')
      return
    }
    if (!clientName.trim()) {
      alert('Please enter your name')
      return
    }
    if (!agreedToTerms) {
      alert('Please agree to the terms and conditions')
      return
    }

    onSign(signature, clientName)
    
    // Reset form
    setSignature(null)
    setClientName('')
    setAgreedToTerms(false)
  }

  const handleClose = () => {
    // Reset form
    setSignature(null)
    setClientName('')
    setAgreedToTerms(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Sign Contract</h2>
              {quoteName && (
                <p className="text-sm text-neutral-600 mt-1">{quoteName}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              By signing below, you agree to the terms outlined in the contract and authorize the work to begin.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Signature <span className="text-red-600">*</span>
            </label>
            <SignatureCanvas onSignatureChange={setSignature} />
          </div>

          {/* Agreement Checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 border border-neutral-200 rounded cursor-pointer"
              />
              <span className="text-sm text-neutral-700">
                I agree to the terms and conditions outlined in the contract and authorize the work described in this quote to begin.
              </span>
            </label>
          </div>

          {/* Signature Preview */}
          {signature && (
            <div>
              <p className="text-sm font-medium text-neutral-700 mb-2">Signature Preview:</p>
              <div className="border border-neutral-200 rounded-lg p-4 bg-neutral-50">
                <img src={signature} alt="Signature" className="max-h-24" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 px-6 py-4 flex gap-3 justify-end bg-neutral-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={!signature || !clientName.trim() || !agreedToTerms}
            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign & Accept Quote
          </button>
        </div>
      </div>
    </div>
  )
}
