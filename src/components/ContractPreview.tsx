import { useState, useEffect } from 'react'

interface ContractPreviewProps {
  file: File
  onSign?: () => void
  showSignButton?: boolean
}

export default function ContractPreview({ file, onSign, showSignButton = false }: ContractPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string>('')

  useEffect(() => {
    // Create blob URL for PDF preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Cleanup
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = file.name
    link.click()
  }

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <div>
            <p className="text-sm font-medium text-neutral-900">Contract Document</p>
            <p className="text-xs text-neutral-500">{file.name}</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="text-sm text-neutral-600 hover:text-neutral-900 font-medium"
        >
          Download
        </button>
      </div>

      {/* PDF Preview */}
      <div className="p-4 bg-neutral-100">
        <div className="bg-white rounded shadow-sm overflow-hidden" style={{ height: '500px' }}>
          <iframe
            src={`${previewUrl}#toolbar=0`}
            className="w-full h-full"
            title="Contract Preview"
          />
        </div>
      </div>

      {/* Sign Button */}
      {showSignButton && onSign && (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <button
            onClick={onSign}
            className="w-full py-3 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Sign Contract & Accept Quote
          </button>
        </div>
      )}
    </div>
  )
}
