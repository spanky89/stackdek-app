import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface ContractUploadProps {
  onFileSelect: (file: File | null) => void
  currentFile?: File | null
}

export default function ContractUpload({ onFileSelect, currentFile }: ContractUploadProps) {
  const [uploadError, setUploadError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError('')

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.file.size > 10 * 1024 * 1024) {
        setUploadError('File is too large. Maximum size is 10MB.')
      } else {
        setUploadError('Please upload a PDF file.')
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  })

  const handleRemove = () => {
    setUploadError('')
    onFileSelect(null)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Contract Document (Optional)
      </label>

      {!currentFile ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-neutral-900 bg-neutral-50'
              : 'border-neutral-300 hover:border-neutral-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            {isDragActive ? (
              <p className="text-sm text-neutral-600">Drop the PDF here...</p>
            ) : (
              <>
                <p className="text-sm font-medium text-neutral-900">
                  Drop contract PDF here, or click to browse
                </p>
                <p className="text-xs text-neutral-500">Maximum file size: 10MB</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">📄</div>
              <div>
                <p className="text-sm font-medium text-neutral-900">{currentFile.name}</p>
                <p className="text-xs text-neutral-500">
                  {(currentFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{uploadError}</p>
      )}

      {currentFile && (
        <p className="text-xs text-neutral-500">
          ✓ Contract will be attached to quote and sent to client for signature
        </p>
      )}
    </div>
  )
}
