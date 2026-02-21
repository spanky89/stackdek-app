import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import CSVImportExport from '../components/CSVImportExport'

interface Company {
  id: string; name: string; phone: string; email: string
  logo_url?: string; website?: string; street_address?: string; city?: string; state?: string; zip?: string; invoice_notes?: string
  stripe_publishable_key?: string; stripe_secret_key?: string; stripe_webhook_secret?: string
  stripe_connected_account_id?: string; stripe_connect_status?: string; stripe_connected_at?: string
}
interface Service { id: string; name: string; price: number; description?: string }
interface Product { id: string; name: string; price: number; description?: string }

type SettingsView = 'menu' | 'business' | 'branding' | 'invoice' | 'payment' | 'services' | 'products' | 'request-form'

export default function SettingsPage() {
  const nav = useNavigate()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<SettingsView>('menu')
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [editItem, setEditItem] = useState<{ name: string; price: string; description: string }>({ name: '', price: '', description: '' })
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [disconnectingStripe, setDisconnectingStripe] = useState(false)

  useEffect(() => { fetchCompany() }, [])

  // Check for Stripe OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_connected') === 'true') {
      setMessage('✅ Stripe account connected successfully!')
      setView('payment')
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
      fetchCompany()
    } else if (params.get('stripe_error')) {
      setMessage(`❌ Stripe connection failed: ${params.get('stripe_error')}`)
      setView('payment')
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  async function fetchCompany() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      let { data: company } = await supabase.from('companies').select('*').eq('owner_id', user.id).single()
      
      // Auto-create company if it doesn't exist
      if (!company) {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({ owner_id: user.id, name: 'My Company' })
          .select()
          .single()
        company = newCompany
      }
      
      setCompany(company)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function fetchServices() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('services').select('*').eq('company_id', company?.id).order('name')
    setServices(data || [])
  }

  async function fetchProducts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('products').select('*').eq('company_id', company?.id).order('name')
    setProducts(data || [])
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setMessage('❌ File too large (max 5 MB)'); return }
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) { setMessage('❌ Invalid file type'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      setCompany({ ...company!, logo_url: e.target?.result as string })
      setMessage('✅ Logo loaded. Click Save to confirm.')
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!company) return
    setSaving(true)
    try {
      const { error } = await supabase.from('companies').update({
        name: company.name, email: company.email, phone: company.phone,
        logo_url: company.logo_url, website: company.website, 
        street_address: company.street_address, city: company.city, state: company.state, zip: company.zip,
        invoice_notes: company.invoice_notes,
        // Note: stripe_publishable_key, stripe_secret_key, stripe_webhook_secret removed - using Stripe Connect instead
      }).eq('id', company.id)
      if (error) throw error
      setMessage('✅ Saved successfully')
      setTimeout(() => { setMessage(''); setView('menu') }, 2000)
    } catch { setMessage('❌ Failed to save') }
    finally { setSaving(false) }
  }

  async function addService() {
    if (!editItem.name.trim() || !company) return
    setSaving(true)
    const { error } = await supabase.from('services').insert({
      company_id: company.id, name: editItem.name.trim(),
      price: parseFloat(editItem.price) || 0, description: editItem.description.trim() || null,
    })
    setSaving(false)
    if (!error) { setEditItem({ name: '', price: '', description: '' }); fetchServices() }
    else setMessage('❌ Failed to add service')
  }

  async function deleteService(id: string) {
    await supabase.from('services').delete().eq('id', id)
    fetchServices()
  }

  async function addProduct() {
    if (!editItem.name.trim() || !company) return
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      company_id: company.id, name: editItem.name.trim(),
      price: parseFloat(editItem.price) || 0, description: editItem.description.trim() || null,
    })
    setSaving(false)
    if (!error) { setEditItem({ name: '', price: '', description: '' }); fetchProducts() }
    else setMessage('❌ Failed to add product')
  }

  async function deleteProduct(id: string) {
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  async function handleStripeConnect() {
    if (!company) return
    setConnectingStripe(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/stripe/connect-oauth', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to initiate Stripe connection')

      const { url } = await response.json()
      // Redirect to Stripe OAuth
      window.location.href = url
    } catch (error) {
      console.error('Stripe Connect error:', error)
      setMessage('❌ Failed to connect to Stripe')
      setConnectingStripe(false)
    }
  }

  async function handleStripeDisconnect() {
    if (!company || !company.stripe_connected_account_id) return
    
    if (!confirm('Are you sure you want to disconnect your Stripe account? Deposit payments will no longer work until you reconnect.')) {
      return
    }

    setDisconnectingStripe(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const response = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to disconnect Stripe')

      setMessage('✅ Stripe account disconnected')
      await fetchCompany()
    } catch (error) {
      console.error('Stripe disconnect error:', error)
      setMessage('❌ Failed to disconnect Stripe')
    } finally {
      setDisconnectingStripe(false)
    }
  }

  function goToView(v: SettingsView) {
    setView(v)
    setMessage('')
    setEditItem({ name: '', price: '', description: '' })
    if (v === 'services') fetchServices()
    if (v === 'products') fetchProducts()
  }

  if (loading) return <div className="min-h-screen bg-neutral-100 flex items-center justify-center"><p>Loading…</p></div>
  if (!company) return <div className="p-6">Company not found</div>

  const backBtn = (
    <button onClick={() => { setView('menu'); setMessage('') }}
      className="mb-6 text-sm text-neutral-600 hover:text-neutral-900 transition">← Back</button>
  )

  const saveBtn = (
    <div className="flex gap-3 pt-4">
      <button onClick={handleSave} disabled={saving}
        className="px-6 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 transition">
        {saving ? 'Saving…' : 'Save'}
      </button>
      {message && <p className="text-sm py-2">{message}</p>}
    </div>
  )

  function menuItem(icon: string, label: string, target: SettingsView) {
    return (
      <button key={label} onClick={() => goToView(target)}
        className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition rounded border-b border-neutral-100 last:border-0">
        <div className="flex items-center gap-3">
          <span className="text-neutral-600">{icon}</span>
          <span className="text-neutral-900">{label}</span>
        </div>
        <span className="text-neutral-400">›</span>
      </button>
    )
  }

  return (
    <AppLayout>
      <div>
        {/* Menu */}
        {view === 'menu' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Account</h2>
              <div className="space-y-2">
                <button onClick={() => nav('/settings/billing')}
                  className="w-full flex items-center justify-between p-3 hover:bg-neutral-50 transition rounded border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-600">■</span>
                    <span className="text-neutral-900">Billing & Subscription</span>
                  </div>
                  <span className="text-neutral-400">›</span>
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Company Details</h2>
              <div className="space-y-2">
                {menuItem('⊞', 'Business Information', 'business')}
                {menuItem('📷', 'Logo & Branding', 'branding')}
                {menuItem('📄', 'Invoice Settings', 'invoice')}
                {menuItem('⚙', 'Payment Settings', 'payment')}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Services & Products</h2>
              <div className="space-y-2">
                {menuItem('☰', 'Manage Services', 'services')}
                {menuItem('□', 'Manage Products', 'products')}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-semibold mb-4 text-neutral-900">Website Integration</h2>
              <div className="space-y-2">
                {menuItem('</', 'Request Form Settings', 'request-form')}
              </div>
            </div>
          </div>
        )}

        {/* Business Information */}
        {view === 'business' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Business Information</h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Business Name</label>
                <input type="text" value={company.name}
                  onChange={e => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <input type="email" value={company.email || ''}
                    onChange={e => setCompany({ ...company, email: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Phone</label>
                  <input type="tel" value={company.phone || ''}
                    onChange={e => setCompany({ ...company, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Website</label>
                <input type="url" value={company.website || ''}
                  onChange={e => setCompany({ ...company, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Street Address</label>
                <input type="text" value={company.street_address || ''}
                  onChange={e => setCompany({ ...company, street_address: e.target.value })}
                  placeholder="123 Main St"
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">City</label>
                  <input type="text" value={company.city || ''}
                    onChange={e => setCompany({ ...company, city: e.target.value })}
                    placeholder="New York"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">State</label>
                  <input type="text" value={company.state || ''}
                    onChange={e => setCompany({ ...company, state: e.target.value })}
                    placeholder="NY"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">ZIP Code</label>
                  <input type="text" value={company.zip || ''}
                    onChange={e => setCompany({ ...company, zip: e.target.value })}
                    placeholder="10001"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
                </div>
              </div>
              {saveBtn}
            </div>

            {/* CSV Import/Export Section */}
            <div className="bg-white rounded-lg shadow-sm p-6 mt-6 space-y-4">
              <h2 className="text-xl font-bold text-neutral-900">Customer Data Management</h2>
              <CSVImportExport companyId={company.id} />
            </div>
          </div>
        )}

        {/* Logo & Branding */}
        {view === 'branding' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Logo & Branding</h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">Upload Logo</label>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={e => handleLogoUpload(e.target.files?.[0])}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg cursor-pointer" />
                <p className="text-xs text-neutral-500 mt-2">PNG, JPG, SVG, or WebP. Max 5 MB.</p>
              </div>
              {company.logo_url && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Preview</label>
                  <div className="flex items-center gap-4">
                    <img src={company.logo_url} alt="Logo" className="h-20 w-auto rounded border border-neutral-200 p-3 bg-neutral-50" />
                    <button onClick={() => setCompany({ ...company, logo_url: '' })}
                      className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded border border-red-200 hover:bg-red-50">Remove</button>
                  </div>
                </div>
              )}
              {saveBtn}
            </div>
          </div>
        )}

        {/* Invoice Settings */}
        {view === 'invoice' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Invoice Settings</h2>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Invoice Notes / Payment Terms</label>
                <textarea value={company.invoice_notes || ''}
                  onChange={e => setCompany({ ...company, invoice_notes: e.target.value })}
                  placeholder="e.g., Payment due within 30 days."
                  rows={5}
                  className="w-full px-4 py-2 border border-neutral-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-opacity-20" />
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-600">💡 <strong>Tip:</strong> These notes appear at the bottom of every invoice.</p>
              </div>
              {saveBtn}
            </div>
          </div>
        )}

        {/* Payment Settings */}
        {view === 'payment' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Payment Settings</h2>
              
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>🔐 Stripe Connect Integration</strong><br />
                  Connect your Stripe account to accept deposit payments on quotes. Payments go directly to your Stripe account — StackDek never touches your money.
                </p>
              </div>

              {/* Connection Status */}
              <div className="p-5 border-2 rounded-lg" style={{
                borderColor: company.stripe_connected_account_id ? '#10b981' : '#d1d5db',
                backgroundColor: company.stripe_connected_account_id ? '#f0fdf4' : '#fafafa'
              }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${company.stripe_connected_account_id ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {company.stripe_connected_account_id ? '✅ Connected' : '○ Not Connected'}
                      </h3>
                      {company.stripe_connected_account_id && (
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-neutral-600">
                            Account ID: <code className="px-2 py-0.5 bg-white rounded border text-xs">{company.stripe_connected_account_id}</code>
                          </p>
                          {company.stripe_connected_at && (
                            <p className="text-xs text-neutral-500">
                              Connected {new Date(company.stripe_connected_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                      {!company.stripe_connected_account_id && (
                        <p className="text-sm text-neutral-600 mt-1">
                          Connect your Stripe account to start accepting deposit payments on quotes
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {!company.stripe_connected_account_id ? (
                      <button
                        onClick={handleStripeConnect}
                        disabled={connectingStripe}
                        className="px-5 py-2.5 bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5147e5] disabled:opacity-50 transition flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                        </svg>
                        {connectingStripe ? 'Connecting...' : 'Connect with Stripe'}
                      </button>
                    ) : (
                      <button
                        onClick={handleStripeDisconnect}
                        disabled={disconnectingStripe}
                        className="px-4 py-2 bg-white border-2 border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition text-sm"
                      >
                        {disconnectingStripe ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`p-4 rounded-lg border ${
                  message.startsWith('✅') ? 'bg-green-50 border-green-200 text-green-800' :
                  message.startsWith('❌') ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <p className="text-sm">{message}</p>
                </div>
              )}

              {/* How It Works */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold text-neutral-900">How Stripe Connect Works</h3>
                <div className="space-y-3 text-sm text-neutral-600">
                  <div className="flex gap-3">
                    <span className="font-bold text-neutral-900">1.</span>
                    <p>Click "Connect with Stripe" to link your existing Stripe account (or create a new one)</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-neutral-900">2.</span>
                    <p>Authorize StackDek to create payment links on your behalf</p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-neutral-900">3.</span>
                    <p>When clients pay deposits on quotes, funds go directly to <strong>your Stripe account</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <span className="font-bold text-neutral-900">4.</span>
                    <p>StackDek only tracks payment status — we never handle your money</p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h4 className="font-medium text-neutral-900 mb-2">✨ Benefits of Stripe Connect</h4>
                <ul className="space-y-1 text-sm text-neutral-600">
                  <li>• Accept credit/debit cards, Apple Pay, Google Pay</li>
                  <li>• Automatic deposit tracking on quotes</li>
                  <li>• Funds deposited directly to your bank (standard Stripe payout schedule)</li>
                  <li>• You control your own Stripe dashboard and settings</li>
                  <li>• No additional fees from StackDek (standard Stripe fees apply)</li>
                </ul>
              </div>

              {/* Legacy Keys Note */}
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>📌 Note:</strong> The old manual API key configuration is being phased out. Stripe Connect is the recommended method going forward. If you previously entered API keys, those will still work but won't be used once Connect is active.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manage Services */}
        {view === 'services' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Manage Services</h2>
              {/* Add New */}
              <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700">Add New Service</h3>
                <input type="text" placeholder="Service name" value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Price" value={editItem.price}
                    onChange={e => setEditItem({ ...editItem, price: e.target.value })}
                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Description" value={editItem.description}
                    onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                </div>
                <button onClick={addService} disabled={saving || !editItem.name.trim()}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add Service'}
                </button>
                {message && <p className="text-sm">{message}</p>}
              </div>
              {/* List */}
              <div className="space-y-2">
                {services.length === 0 ? (
                  <p className="text-neutral-500 text-sm text-center py-4">No services yet. Add your first one above.</p>
                ) : services.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-neutral-500">${s.price.toFixed(2)}{s.description ? ` · ${s.description}` : ''}</p>
                    </div>
                    <button onClick={() => deleteService(s.id)} className="text-red-500 text-sm hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Manage Products */}
        {view === 'products' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Manage Products</h2>
              <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <h3 className="text-sm font-medium text-neutral-700">Add New Product</h3>
                <input type="text" placeholder="Product name" value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder="Price" value={editItem.price}
                    onChange={e => setEditItem({ ...editItem, price: e.target.value })}
                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                  <input type="text" placeholder="Description" value={editItem.description}
                    onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                    className="px-3 py-2 border border-neutral-200 rounded-lg text-sm" />
                </div>
                <button onClick={addProduct} disabled={saving || !editItem.name.trim()}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add Product'}
                </button>
                {message && <p className="text-sm">{message}</p>}
              </div>
              <div className="space-y-2">
                {products.length === 0 ? (
                  <p className="text-neutral-500 text-sm text-center py-4">No products yet. Add your first one above.</p>
                ) : products.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-neutral-500">${p.price.toFixed(2)}{p.description ? ` · ${p.description}` : ''}</p>
                    </div>
                    <button onClick={() => deleteProduct(p.id)} className="text-red-500 text-sm hover:text-red-700">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Request Form Settings */}
        {view === 'request-form' && (
          <div>
            {backBtn}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Request Form Settings</h2>
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
                <p className="text-sm text-neutral-700">
                  Embed a service request form on your website so customers can submit requests directly to StackDek.
                </p>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Embed Code</label>
                  <div className="bg-white border border-neutral-200 rounded-lg p-3">
                    <code className="text-xs text-neutral-600 break-all">
                      {`<iframe src="${window.location.origin}/request/${company.id}" width="100%" height="600" frameborder="0"></iframe>`}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${window.location.origin}/request/${company.id}" width="100%" height="600" frameborder="0"></iframe>`)
                      setMessage('✅ Copied to clipboard')
                      setTimeout(() => setMessage(''), 2000)
                    }}
                    className="mt-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm"
                  >Copy Embed Code</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Direct Link</label>
                  <p className="text-sm text-blue-600 break-all">{window.location.origin}/request/{company.id}</p>
                </div>
                {message && <p className="text-sm mt-2">{message}</p>}
              </div>
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <p className="text-sm text-neutral-600">
                  💡 <strong>Tip:</strong> Share the direct link or embed the form on your website. Submitted requests will appear in your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
