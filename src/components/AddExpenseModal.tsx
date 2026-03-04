import { useState, useRef } from 'react'
import { ExpenseCategory, categoryIcons, categoryLabels } from '../types/jobCosting'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (expense: {
    category: ExpenseCategory
    description: string
    amount: number
    receiptFile?: File
  }) => void
}

export default function AddExpenseModal({ isOpen, onClose, onAdd }: AddExpenseModalProps) {
  const [step, setStep] = useState<'photo' | 'details'>('photo')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('materials')
  const [description, setDescription] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
        // Mock OCR: Extract amount from filename or random
        const mockAmount = Math.floor(Math.random() * 500) + 50
        setAmount(mockAmount.toString())
      }
      reader.readAsDataURL(file)
      
      setStep('details')
    }
  }

  const handleSubmit = () => {
    if (!amount || !category) {
      alert('Please enter amount and select category')
      return
    }

    onAdd({
      category,
      description,
      amount: parseFloat(amount),
      receiptFile: receiptFile || undefined
    })

    // Reset
    setStep('photo')
    setAmount('')
    setCategory('materials')
    setDescription('')
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  const handleClose = () => {
    setStep('photo')
    setAmount('')
    setCategory('materials')
    setDescription('')
    setReceiptFile(null)
    setReceiptPreview(null)
    onClose()
  }

  const categories: ExpenseCategory[] = ['materials', 'equipment', 'subcontractors', 'permits', 'fuel', 'other']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-neutral-900">
              {step === 'photo' ? 'Add Expense' : 'Confirm Details'}
            </h2>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {step === 'photo' ? (
            /* Step 1: Photo Receipt */
            <div className="space-y-4">
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors flex flex-col items-center justify-center gap-3 bg-neutral-50"
                >
                  <span className="text-6xl">📷</span>
                  <span className="text-lg font-medium text-neutral-700">Tap to Photo Receipt</span>
                  <span className="text-sm text-neutral-500">Camera will open</span>
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setStep('details')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Skip Photo →
                </button>
              </div>
            </div>
          ) : (
            /* Step 2: Confirm Details */
            <div className="space-y-4">
              {/* Receipt Preview */}
              {receiptPreview && (
                <div className="border border-neutral-200 rounded-lg p-2">
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    className="w-full h-32 object-cover rounded"
                  />
                  <button
                    onClick={() => {
                      setStep('photo')
                      setReceiptFile(null)
                      setReceiptPreview(null)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    Change photo
                  </button>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="450.00"
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                {amount && receiptPreview && (
                  <p className="text-xs text-green-600 mt-1">✓ Auto-detected from receipt</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Category <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        category === cat
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{categoryIcons[cat]}</div>
                      <div className="text-xs font-medium text-neutral-700">{categoryLabels[cat]}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lumber for deck"
                  className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="border-t border-neutral-200 px-6 py-4 flex gap-3 justify-end bg-neutral-50">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount || !category}
              className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Expense
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
