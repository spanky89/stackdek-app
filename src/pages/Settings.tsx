import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import Header from '../components/Header'

interface Company {
  id: string
  name: string
  phone: string
  email: string
  logo_url?: string
  tax_id?: string
  invoice_notes?: string
}

type SettingsView = 'menu' | 'business' | 'branding' | 'invoice'

export default function SettingsPage() {
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<SettingsView>('menu')

  useEffect(() => {
    fetchCompany()
  }, [])

  async function fetchCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (error) throw error
      setCompany(data)
    } catch (err) {
      console.error('Failed to fetch company:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return
    
    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File too large (max 5 MB)')
      return
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setMessage('❌ Invalid file type. Use PNG, JPG, SVG, or WebP.')
      return
    }

    // Convert to data URL for preview/storage
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setCompany({ ...company, logo_url: dataUrl })
      setMessage('✅ Logo loaded. Click Save to confirm.')
    }
    reader.onerror = () => {
      setMessage('❌ Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: company.name,
          email: company.email,
          phone: company.phone,
          logo_url: company.logo_url,
          tax_id: company.tax_id,
          invoice_notes: company.invoice_notes,
        })
        .eq('id', company.id)

      if (error) throw error
      setMessage('✅ Saved successfully')
      setTimeout(() => {
        setMessage('')
        setView('menu')
      }, 2000)
    } catch (err) {
      setMessage('❌ Failed to save')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!company) return <div className="p-6">Company not found</div>

  return (
    <div className="min-h-screen bg-neutral-100">
      <Header />

      <main className="pt-6 pb-20 px-4 max-w-2xl mx-auto">
        {/* Menu View */}
        {view === 'menu' && (
          <div className="space-y-4">
            {/* Company Details Section */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Company Details</h2>
              <div className="space-y-2">
                {/* Business Information */}
                <button
                  onClick={() => setView('business')}
                  className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition rounded border-b border-neutral-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏢</span>
                    <span className="text-neutral-900">Business Information</span>
                  </div>
                  <span className="text-neutral-400">›</span>
                </button>

                {/* Logo & Branding */}
                <button
                  onClick={() => setView('branding')}
                  className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition rounded border-b border-neutral-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🖼️</span>
                    <span className="text-neutral-900">Logo & Branding</span>
                  </div>
                  <span className="text-neutral-400">›</span>
                </button>

                {/* Invoice Settings */}
                <button
                  onClick={() => setView('invoice')}
                  className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📄</span>
                    <span className="text-neutral-900">Invoice Settings</span>
                  </div>
                  <span className="text-neutral-400">›</span>
                </button>
              </div>
            </div>

            {/* Services & Products Section (placeholder) */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Services & Products</h2>
              <div className="space-y-2 text-neutral-500 text-sm">
                <p className="p-3">Coming soon: Manage your services and products.</p>
              </div>
            </div>
          </div>
        )}

        {/* Business Information View */}
        {view === 'business' && (
          <div>
            <button
              onClick={() => setView('menu')}
              className="mb-6 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              ← Back
            </button>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Business Information</h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={company.email || ''}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={company.phone || ''}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Tax ID / EIN
                </label>
                <input
                  type="text"
                  value={company.tax_id || ''}
                  onChange={(e) => setCompany({ ...company, tax_id: e.target.value })}
                  placeholder="XX-XXXXXXX"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {message && <p className="text-sm py-2">{message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Logo & Branding View */}
        {view === 'branding' && (
          <div>
            <button
              onClick={() => setView('menu')}
              className="mb-6 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              ← Back
            </button>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Logo & Branding</h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Upload Logo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={(e) => handleLogoUpload(e.target.files?.[0])}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20 cursor-pointer"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-2">PNG, JPG, SVG, or WebP. Max 5 MB. Recommended: 200x50 pixels.</p>
              </div>

              {company.logo_url && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Preview
                  </label>
                  <div className="flex items-center gap-4">
                    <img 
                      src={company.logo_url} 
                      alt="Logo preview" 
                      className="h-20 w-auto rounded border border-neutral-200 p-3 bg-neutral-50"
                      onError={() => setMessage('❌ Could not load logo')}
                    />
                    <button
                      onClick={() => setCompany({ ...company, logo_url: '' })}
                      className="text-sm text-red-600 hover:text-red-700 transition px-3 py-1 rounded border border-red-200 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-600">
                  💡 <strong>Tip:</strong> Your logo will appear on invoices and throughout the app. Choose a PNG or SVG for crisp quality.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {message && <p className="text-sm py-2">{message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Invoice Settings View */}
        {view === 'invoice' && (
          <div>
            <button
              onClick={() => setView('menu')}
              className="mb-6 text-sm text-neutral-600 hover:text-neutral-900 transition"
            >
              ← Back
            </button>
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Invoice Settings</h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Invoice Notes / Payment Terms
                </label>
                <textarea
                  value={company.invoice_notes || ''}
                  onChange={(e) => setCompany({ ...company, invoice_notes: e.target.value })}
                  placeholder="e.g., Payment due within 30 days. Make checks payable to [Company Name]."
                  rows={5}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20 resize-none"
                />
              </div>

              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-600">
                  💡 <strong>Tip:</strong> Add payment instructions, due dates, or late fees here. These will appear at the bottom of every invoice you send.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {message && <p className="text-sm py-2">{message}</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
