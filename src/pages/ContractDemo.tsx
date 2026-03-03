import { useState } from 'react'
import AppLayout from '../components/AppLayout'
import ContractUpload from '../components/ContractUpload'
import ContractPreview from '../components/ContractPreview'

export default function ContractDemo() {
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleFileSelect = (file: File | null) => {
    setContractFile(file)
    setShowPreview(false)
  }

  const handleSign = () => {
    alert('Signature modal will open here!')
    // This will trigger the signature modal in the next phase
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Contract Upload Demo
          </h1>
          <p className="text-neutral-600">
            Test the contract upload and preview functionality (Pro feature)
          </p>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Upload Contract
            </h2>
            <ContractUpload
              onFileSelect={handleFileSelect}
              currentFile={contractFile}
            />

            {contractFile && (
              <div className="mt-4">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
            )}
          </div>

          {/* Preview Section */}
          {contractFile && showPreview && (
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">
                Client View (with Sign Button)
              </h2>
              <ContractPreview
                file={contractFile}
                onSign={handleSign}
                showSignButton={true}
              />
            </div>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              How This Works:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Admin uploads PDF contract when creating a quote</li>
              <li>• Client receives quote with contract attached</li>
              <li>• Client clicks "Sign Contract & Accept Quote"</li>
              <li>• Signature modal opens (next phase)</li>
              <li>• Signed contract is saved and attached to quote</li>
            </ul>
          </div>

          {/* Mock Quote Card */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Mock Quote Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Quote #:</span>
                <span className="font-medium">Q-1001</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Client:</span>
                <span className="font-medium">John Smith</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Total:</span>
                <span className="font-medium">$3,450.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Contract Status:</span>
                <span className={`font-medium ${contractFile ? 'text-green-600' : 'text-neutral-400'}`}>
                  {contractFile ? '✓ Contract Attached' : 'No Contract'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
