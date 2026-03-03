/**
 * Signature utility functions
 */

export interface SignatureData {
  signature: string // base64 image
  name: string
  signedAt: string // ISO timestamp
  ipAddress?: string
}

/**
 * Create signature data object
 */
export function createSignatureData(signature: string, name: string): SignatureData {
  return {
    signature,
    name,
    signedAt: new Date().toISOString(),
  }
}

/**
 * Validate signature image (basic check)
 */
export function isValidSignature(signature: string): boolean {
  return signature.startsWith('data:image/png;base64,') && signature.length > 100
}

/**
 * Convert base64 signature to blob for upload
 */
export function signatureToBlob(base64Signature: string): Blob {
  const arr = base64Signature.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
}

/**
 * Generate filename for signed contract
 */
export function generateSignedContractFilename(quoteId: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  return `contract-signed-${quoteId}-${timestamp}.pdf`
}

/**
 * Future: Overlay signature on PDF using pdf-lib
 * This will be implemented when we integrate with actual PDF contracts
 */
export async function overlaySignatureOnPDF(
  pdfFile: File,
  signature: string,
  signedBy: string
): Promise<Blob> {
  // TODO: Use pdf-lib to overlay signature on last page of PDF
  // For now, return original PDF (placeholder)
  console.log('overlaySignatureOnPDF called:', { signedBy })
  return pdfFile
}
