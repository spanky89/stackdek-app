import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'
import AppLayout from '../components/AppLayout'
import { LineItemCard } from '../components/LineItemCard'
import { DocumentSummary } from '../components/DocumentSummary'
import { UnifiedLineItem } from '../types/lineItems'
import { MediaUpload } from '../components/MediaUpload'
import { OnMyWayModal } from '../components/OnMyWayModal'

type Photo = {
  url: string
  caption: string
  order: number
}

type Quote = {
  id: string; title: string; status: string; amount: number
  expiration_date: string | null; client_id: string | null
  company_id: string | null
  deposit_amount: number | null; deposit_paid: boolean
  stripe_checkout_session_id: string | null
  tax_rate: number | null
  tax_amount: number | null
  notes: string | null
  discount_type: 'percentage' | 'dollar' | null
  discount_amount: number | null
  video_url: string | null
  photos: Photo[]
  clients: { id: string; name: string; email?: string; phone?: string; address?: string } | null
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [lineItems, setLineItems] = useState<UnifiedLineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [depositAmount, setDepositAmount] = useState<string>('0')
  const [processingPayment, setProcessingPayment] = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [taxRateInput, setTaxRateInput] = useState<string>('0')
  const [editingTax, setEditingTax] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositType, setDepositType] = useState<'percentage' | 'dollar'>('percentage')
  const [depositValue, setDepositValue] = useState<string>('0')
  const [activeTab, setActiveTab] = useState<'quote' | 'notes'>('quote')
  const [notes, setNotes] = useState<string>('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [showServiceSelector, setShowServiceSelector] = useState(false)
  const [savedServices, setSavedServices] = useState<any[]>([])
  const [savedProducts, setSavedProducts] = useState<any[]>([])
  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<'percentage' | 'dollar'>('percentage')
  const [discountValue, setDiscountValue] = useState<string>('0')
  const [showOnMyWayModal, setShowOnMyWayModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [companyName, setCompanyName] = useState<string>('StackDek')

  useEffect(() => {
    // Check for payment success/cancel in URL
    const paymentStatus = searchParams.get('payment')
    if (paymentStatus === 'success') {
      console.log('Payment successful!')
    } else if (paymentStatus === 'cancelled') {
      console.log('Payment cancelled')
    }
    
    // Auto-open send modal if ?send=true
    const shouldSend = searchParams.get('send')
    if (shouldSend === 'true' && quote) {
      setShowSendModal(true)
      // Clean up URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('send')
      nav(`/quote/${id}?${newParams.toString()}`, { replace: true })
    }
  }, [searchParams, quote, id, nav])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, stripe_connected_account_id')
        .eq('owner_id', user.id)
        .single()
      
      if (!company) {
        setCheckingStripe(false)
        return
      }
      
      if (company.name) {
        setCompanyName(company.name)
      }
      
      // Check if Stripe Connect is configured
      setStripeConnected(!!company.stripe_connected_account_id)
      setCheckingStripe(false)
      
      const { data: services } = await supabase
        .from('services')
        .select('id, name, price, description')
        .eq('company_id', company.id)
        .order('name')
      
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price, description')
        .eq('company_id', company.id)
        .order('name')
      
      setSavedServices(services || [])
      setSavedProducts(products || [])
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('quotes')
          .select('id, title, status, amount, expiration_date, client_id, company_id, deposit_amount, deposit_paid, stripe_checkout_session_id, tax_rate, tax_amount, notes, discount_type, discount_amount, video_url, photos, clients(id, name, email, phone, address)')
          .eq('id', id)
          .single()
        if (fetchErr) { setError(fetchErr.message); return }
        setQuote(data as any)
        setNotes((data as any).notes || '')
        setVideoUrl((data as any).video_url || null)
        setPhotos((data as any).photos || [])
        
        // Set discount values
        setDiscountType((data as any).discount_type || 'percentage')
        setDiscountValue(((data as any).discount_amount || 0).toString())
        
        // Set tax rate (default to 0%)
        setTaxRateInput((data.tax_rate ?? 0).toString())
        
        // Set deposit amount (default to 0)
        setDepositAmount((data.deposit_amount ?? 0).toString())
        
        // Fetch line items with title field
        const { data: items, error: itemsErr } = await supabase
          .from('quote_line_items')
          .select('id, title, description, quantity, unit_price, sort_order')
          .eq('quote_id', id)
          .order('sort_order', { ascending: true })
        if (itemsErr) { 
          console.error('Line items error:', itemsErr)
        }
        setLineItems((items || []).map((item, index) => ({
          ...item,
          sort_order: item.sort_order ?? index
        })))
        
        // Set deposit amount (default to 0)
        setDepositAmount((data.deposit_amount ?? 0).toString())
        
        // Check Stripe connection status - COMMENTED OUT FOR BETA\n        // await checkStripeConnection()
      } catch (e: any) { setError(e?.message ?? 'Unknown error') }
      finally { setLoading(false) }
    })()
  }, [id])

  // STRIPE - Commented out for beta (re-enable before public launch)
  // async function checkStripeConnection() {
  //   try {
  //     const { data: { user } } = await supabase.auth.getUser()
  //     if (!user) return
  //     
  //     const { data: company } = await supabase
  //       .from('companies')
  //       .select('stripe_publishable_key, stripe_secret_key')
  //       .eq('owner_id', user.id)
  //       .single()
  //     
  //     setStripeConnected(!!(company?.stripe_publishable_key && company?.stripe_secret_key))
  //   } catch (e) {
  //     console.error('Error checking Stripe connection:', e)
  //   } finally {
  //     setCheckingStripe(false)
  //   }
  // }

  async function updateStatus(newStatus: string, finalAmount?: number) {
    setBusy(true)
    const updateData: any = { status: newStatus }
    if (finalAmount !== undefined) {
      updateData.amount = finalAmount
    }
    const { error: upErr } = await supabase.from('quotes').update(updateData).eq('id', id)
    
    // If quote is being accepted, create a job with line items
    if (newStatus === 'accepted' && quote?.client_id && quote?.company_id) {
      const jobData = {
        company_id: quote.company_id,
        client_id: quote.client_id,
        title: quote.title,
        estimate_amount: finalAmount ?? quote.amount ?? 0,
        status: 'scheduled',
        date_scheduled: new Date().toISOString().split('T')[0], // Today's date
        location: quote.clients?.address || null,
      }
      
      const { data: newJob, error: jobErr } = await supabase.from('jobs').insert(jobData).select('id').single()
      if (jobErr) {
        console.error('Failed to create job:', jobErr)
        setError('Quote approved but failed to create job: ' + jobErr.message)
      } else if (newJob) {
        // Copy line items from quote to job
        const { data: quoteLineItems } = await supabase
          .from('quote_line_items')
          .select('*')
          .eq('quote_id', id)
        
        if (quoteLineItems && quoteLineItems.length > 0) {
          const jobLineItems = quoteLineItems.map((item: any) => ({
            job_id: newJob.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            sort_order: item.sort_order,
          }))
          
          const { error: lineItemErr } = await supabase.from('job_line_items').insert(jobLineItems)
          if (lineItemErr) {
            console.error('Failed to copy line items:', lineItemErr)
          }
        }
      }
    }
    
    setBusy(false)
    if (upErr) { setError(upErr.message); return }
    setQuote({ ...quote!, status: newStatus, amount: finalAmount ?? quote!.amount })
    
    // Redirect to jobs if quote was accepted
    if (newStatus === 'accepted') {
      setTimeout(() => nav('/jobs'), 1000)
    }
  }

  async function completeAndCreateQuote() {
    if (!confirm('Complete this appointment and create a quote?')) return
    
    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ 
        status: 'draft',
        scheduled_date: null,
        scheduled_time: null
      })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) {
      setError(upErr.message)
      return
    }
    
    setQuote({ ...quote!, status: 'draft' })
    setActiveTab('quote')
  }

  async function saveDepositAmount() {
    const parsedDeposit = parseFloat(depositAmount)
    if (isNaN(parsedDeposit) || parsedDeposit < 0) {
      setError('Please enter a valid deposit amount')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ deposit_amount: parsedDeposit })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, deposit_amount: parsedDeposit })
  }

  async function saveTaxRate() {
    const parsedRate = parseFloat(taxRateInput)
    if (isNaN(parsedRate) || parsedRate < 0) {
      setError('Please enter a valid tax rate')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ tax_rate: parsedRate })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, tax_rate: parsedRate })
    setEditingTax(false)
  }

  async function saveDeposit() {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    let depositDollars = 0
    
    if (depositType === 'percentage') {
      const pct = parseFloat(depositValue)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        setError('Please enter a valid percentage (0-100)')
        return
      }
      depositDollars = (subtotal * pct) / 100
    } else {
      depositDollars = parseFloat(depositValue)
      if (isNaN(depositDollars) || depositDollars < 0) {
        setError('Please enter a valid deposit amount')
        return
      }
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ deposit_amount: depositDollars })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, deposit_amount: depositDollars })
    setDepositAmount(depositDollars.toString())
    setShowDepositModal(false)
  }

  // Add new line item
  async function addLineItem() {
    const newItem: Partial<UnifiedLineItem> = {
      quote_id: id!,
      title: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      sort_order: lineItems.length,
    }

    const { data, error } = await supabase
      .from('quote_line_items')
      .insert(newItem)
      .select()
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setLineItems([...lineItems, data])
  }

  async function updateLineItem(updated: UnifiedLineItem) {
    const { error } = await supabase
      .from('quote_line_items')
      .update({
        title: updated.title,
        description: updated.description,
        quantity: updated.quantity,
        unit_price: updated.unit_price
      })
      .eq('id', updated.id)
    
    if (error) { 
      setError(error.message)
      return 
    }
    
    setLineItems(lineItems.map(item => item.id === updated.id ? updated : item))
  }

  async function deleteLineItem(itemId: string) {
    const { error } = await supabase
      .from('quote_line_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      setError(error.message)
      return
    }

    setLineItems(items => items.filter(item => item.id !== itemId))
  }

  async function moveLineItemUp(index: number) {
    if (index === 0) return
    const newItems = [...lineItems]
    ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
    
    // Update sort_order for both items
    await Promise.all([
      supabase.from('quote_line_items').update({ sort_order: index - 1 }).eq('id', newItems[index - 1].id),
      supabase.from('quote_line_items').update({ sort_order: index }).eq('id', newItems[index].id),
    ])

    setLineItems(newItems.map((item, idx) => ({ ...item, sort_order: idx })))
  }

  async function moveLineItemDown(index: number) {
    if (index === lineItems.length - 1) return
    const newItems = [...lineItems]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    
    // Update sort_order for both items
    await Promise.all([
      supabase.from('quote_line_items').update({ sort_order: index }).eq('id', newItems[index].id),
      supabase.from('quote_line_items').update({ sort_order: index + 1 }).eq('id', newItems[index + 1].id),
    ])

    setLineItems(newItems.map((item, idx) => ({ ...item, sort_order: idx })))
  }

  async function handleStripePayment() {
    if (!quote?.deposit_amount || quote.deposit_amount <= 0) {
      setError('Please set a deposit amount first')
      return
    }

    if (!stripeConnected) {
      setError('Stripe not configured. Please configure in Settings > Payment Settings')
      return
    }

    setProcessingPayment(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        setProcessingPayment(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('owner_id', user?.id)
        .single()

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          quoteId: id,
          depositAmount: quote.deposit_amount,
          clientEmail: quote.clients?.email || '',
          clientName: quote.clients?.name || '',
          companyName: company?.name || 'StackDek Job',
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment')
      setProcessingPayment(false)
    }
  }

  async function markOfflinePayment() {
    if (!quote) return
    
    setBusy(true)
    setError(null)
    
    try {
      const { error: upErr } = await supabase
        .from('quotes')
        .update({ 
          deposit_paid: true,
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (upErr) throw new Error(`Failed to mark deposit paid: ${upErr.message}`)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const jobData = {
        quote_id: quote.id,
        title: quote.title,
        client_id: quote.client_id,
        company_id: quote.company_id,
        status: 'scheduled',
        date_scheduled: tomorrow.toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      }
      
      const { data: newJob, error: jobErr } = await supabase
        .from('jobs')
        .insert(jobData)
        .select()
        .single()

      if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`)
      if (!newJob) throw new Error('Job created but no data returned')

      setQuote({ ...quote, deposit_paid: true })
      setBusy(false)
      
      alert(`✓ Deposit marked as paid. Job created!`)
      nav('/jobs')
    } catch (err: any) {
      console.error('[markOfflinePayment] ERROR:', err)
      setError(err.message || 'Failed to process offline payment')
      setBusy(false)
    }
  }

  function copyShareableLink() {
    const shareUrl = `${window.location.origin}/quotes/view/${id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveNotes() {
    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ notes })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, notes })
    setEditingNotes(false)
  }

  async function saveDiscount() {
    const parsedValue = parseFloat(discountValue)
    if (isNaN(parsedValue) || parsedValue < 0) {
      setError('Please enter a valid discount amount')
      return
    }

    setBusy(true)
    const { error: upErr } = await supabase
      .from('quotes')
      .update({ 
        discount_type: discountType,
        discount_amount: parsedValue
      })
      .eq('id', id)
    
    setBusy(false)
    if (upErr) { 
      setError(upErr.message)
      return 
    }
    
    setQuote({ ...quote!, discount_type: discountType, discount_amount: parsedValue })
    setEditingDiscount(false)
  }

  async function addServiceToQuote(service: any) {
    setBusy(true)
    setError(null)
    
    const maxSortOrder = lineItems.length > 0 
      ? Math.max(...lineItems.map(item => item.sort_order ?? 0))
      : -1
    
    const { data: newItem, error: insertErr } = await supabase
      .from('quote_line_items')
      .insert({
        quote_id: id,
        title: service.name,
        description: service.description || '',
        quantity: 1,
        unit_price: service.price,
        sort_order: maxSortOrder + 1
      })
      .select()
      .single()
    
    setBusy(false)
    
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    
    setLineItems([...lineItems, newItem as UnifiedLineItem])
    setShowServiceSelector(false)
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this quote? This cannot be undone.')) return

    setBusy(true)
    setError(null)
    try {
      const { error: itemsErr } = await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id)
      
      if (itemsErr) {
        console.error('Error deleting line items:', itemsErr)
        throw new Error(`Failed to delete line items: ${itemsErr.message}`)
      }

      const { error: delErr } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)
      
      if (delErr) {
        console.error('Error deleting quote:', delErr)
        throw new Error(`Failed to delete quote: ${delErr.message}`)
      }

      nav('/quotes')
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err?.message || 'Failed to delete quote')
      setBusy(false)
      alert(`Delete failed: ${err?.message || 'Unknown error'}`)
    }
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!quote) return <div className="p-6">Quote not found.</div>

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    draft: 'bg-neutral-100 text-neutral-800',
    sent: 'bg-neutral-100 text-neutral-800',
    accepted: 'bg-neutral-100 text-neutral-800',
    declined: 'bg-neutral-100 text-neutral-800',
    expired: 'bg-neutral-100 text-neutral-800',
  }

  // Check if this is a scheduled appointment (not a quote yet)
  const isScheduledAppointment = quote.status === 'scheduled'

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  
  // Calculate discount
  let discountAmount = 0
  if (quote?.discount_type === 'percentage' && quote?.discount_amount) {
    discountAmount = (subtotal * quote.discount_amount) / 100
  } else if (quote?.discount_type === 'dollar' && quote?.discount_amount) {
    discountAmount = quote.discount_amount
  }
  
  const discountedSubtotal = subtotal - discountAmount
  const taxRate = quote?.tax_rate ?? 0
  const tax = (discountedSubtotal * taxRate) / 100
  const total = discountedSubtotal + tax
  const depositRequired = quote?.deposit_amount ?? 0

  return (
    <AppLayout>
      <>
        {/* Back Button & Menu */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => nav('/quotes')} className="text-neutral-700 text-2xl leading-none">←</button>
          <div className="flex gap-2">
            <button onClick={() => nav(`/quote/${id}/edit`)} className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium">
              Edit
            </button>
            <button onClick={handleDelete} disabled={busy} className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-40">
              Delete
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-medium ${statusColors[quote.status] || 'bg-neutral-100 text-neutral-800'}`}>
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </span>
        </div>

        {/* Hero Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-neutral-900 mb-1">
            {isScheduledAppointment ? (
              `Appointment with ${quote.clients?.name || 'Client'}`
            ) : (
              `Quote for ${quote.clients?.name} for ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </h1>
          <p className="text-neutral-600">{quote.title}</p>
        </div>

        {!isScheduledAppointment && (
          /* Metadata */
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div>
              <span className="text-neutral-500 block mb-1">Created</span>
              <p className="font-medium">{new Date(quote.expiration_date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div>
              <span className="text-neutral-500 block mb-1">Viewed</span>
              <p className="font-medium">—</p>
            </div>
          </div>
        )}

        {/* Client Info & Quick Actions */}
        {quote.clients && (
          <div className="mb-6">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-neutral-900">{quote.clients.name}</p>
                {quote.clients.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.clients.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 hover:text-neutral-700 flex-shrink-0"
                    title="Navigate"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </a>
                )}
              </div>
              {quote.clients.phone && <p className="text-sm text-neutral-600">{quote.clients.phone}</p>}
              {quote.clients.email && <p className="text-sm text-neutral-600">{quote.clients.email}</p>}
              {quote.clients.address && <p className="text-sm text-neutral-600">{quote.clients.address}</p>}
            </div>

            {/* Client Action Buttons */}
            {isScheduledAppointment ? (
              <div className="space-y-3">
                {quote.clients.phone && (
                  <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${quote.clients.phone}`}
                      className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                    >
                      Call
                    </a>
                    <a 
                      href={`sms:${quote.clients.phone}`}
                      className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                    >
                      Message
                    </a>
                  </div>
                )}
                {quote.clients.phone && (
                  <button
                    onClick={() => setShowOnMyWayModal(true)}
                    className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                  >
                    On My Way
                  </button>
                )}
              </div>
            ) : (
              quote.clients.phone && (
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={`tel:${quote.clients.phone}`}
                    className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                  >
                    Call
                  </a>
                  <a 
                    href={`sms:${quote.clients.phone}`}
                    className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 text-center"
                  >
                    Message
                  </a>
                </div>
              )
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isScheduledAppointment && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              onClick={() => updateStatus('accepted', total)} 
              disabled={busy || quote.status === 'accepted'}
              className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800 disabled:opacity-40"
            >
              Approve
            </button>
            <button 
              onClick={() => setShowSendModal(true)}
              className="px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800"
            >
              {quote.status === 'draft' ? 'Send' : 'Resend'}
            </button>
          </div>
        )}

        {/* Scheduled Appointment View */}
        {isScheduledAppointment ? (
          <>
            {/* Notes Section for Scheduled Appointments */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-neutral-900">Appointment Notes</h2>
                {!editingNotes ? (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotes(quote?.notes || '')
                        setEditingNotes(false)
                      }}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded text-sm font-medium hover:bg-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNotes}
                      disabled={busy}
                      className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              
              {editingNotes ? (
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this appointment..."
                />
              ) : (
                <div className="text-sm text-neutral-700 whitespace-pre-wrap min-h-[8rem]">
                  {notes || <span className="text-neutral-400 italic">No notes yet. Click Edit to add notes.</span>}
                </div>
              )}
            </div>

            {/* Complete and Create Quote Button */}
            <button
              onClick={completeAndCreateQuote}
              disabled={busy}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              Complete Appointment & Create Quote
            </button>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-neutral-200 mb-6">
              <button 
                onClick={() => setActiveTab('quote')}
                className={`px-6 py-3 text-sm font-semibold ${activeTab === 'quote' ? 'text-neutral-900 border-b-2 border-red-700' : 'text-neutral-500 font-medium'}`}
              >
                Quote
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-3 text-sm font-semibold ${activeTab === 'notes' ? 'text-neutral-900 border-b-2 border-red-700' : 'text-neutral-500 font-medium'}`}
              >
                Notes
              </button>
            </div>

        {/* Quote Tab Content */}
        {activeTab === 'quote' && (
          <>
            {/* Product / Service Label */}
            <div className="mb-3">
              <h3 className="text-sm text-neutral-500 font-medium">Product / Service</h3>
            </div>

            {/* Line Items Section */}
        <div className="bg-white border-t border-b border-neutral-200 py-4 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Line items</h2>
          </div>
          
          {lineItems.length > 0 ? (
            <div className="space-y-3 mb-4">
              {lineItems.map((item, index) => (
                <LineItemCard
                  key={item.id}
                  item={item}
                  mode="edit"
                  onUpdate={updateLineItem}
                  onDelete={() => deleteLineItem(item.id)}
                  onMoveUp={() => moveLineItemUp(index)}
                  onMoveDown={() => moveLineItemDown(index)}
                  isFirst={index === 0}
                  isLast={index === lineItems.length - 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center py-4 mb-4">No line items</p>
          )}

          {/* Add Service/Product Button */}
          <button
            type="button"
            onClick={() => setShowServiceSelector(true)}
            className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50 font-medium flex items-center justify-center gap-2"
          >
            + Add from Services / Products
          </button>
        </div>

        {/* Financial Summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-neutral-900 font-medium">Subtotal</span>
            <span className="font-semibold text-neutral-900">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Discount Line */}
          <div className="flex justify-between items-center">
            <span className="text-neutral-900 font-medium">Discount</span>
            {editingDiscount ? (
              <div className="flex gap-2 items-center">
                <select
                  className="px-2 py-1 text-xs rounded border border-neutral-300"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'dollar')}
                >
                  <option value="percentage">%</option>
                  <option value="dollar">$</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === 'percentage' ? '100' : undefined}
                  className="w-20 px-2 py-1 text-sm rounded border border-neutral-300"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveDiscount()
                    if (e.key === 'Escape') {
                      setEditingDiscount(false)
                      setDiscountType(quote?.discount_type || 'percentage')
                      setDiscountValue((quote?.discount_amount || 0).toString())
                    }
                  }}
                  autoFocus
                />
                <button onClick={saveDiscount} disabled={busy} className="px-2 py-1 bg-neutral-900 text-white rounded text-xs">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingDiscount(true)} className="font-semibold text-neutral-900">
                {discountAmount > 0 ? (
                  <>-${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {quote?.discount_type === 'percentage' && `(${quote?.discount_amount}%)`}</>
                ) : (
                  '$0.00'
                )}
              </button>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-neutral-900 font-medium">Tax</span>
            {editingTax ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-20 px-2 py-1 text-sm rounded border border-neutral-300"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTaxRate()
                    if (e.key === 'Escape') {
                      setEditingTax(false)
                      setTaxRateInput((quote?.tax_rate ?? 0).toString())
                    }
                  }}
                  autoFocus
                />
                <span className="text-sm text-neutral-600">%</span>
                <button onClick={saveTaxRate} disabled={busy} className="px-2 py-1 bg-neutral-900 text-white rounded text-xs">
                  Save
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingTax(true)} className="font-semibold text-neutral-900">
                ${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({taxRate}%)
              </button>
            )}
          </div>

          <div className="bg-neutral-50 -mx-4 px-4 py-3 flex justify-between items-center">
            <span className="text-lg font-bold text-neutral-900">Total</span>
            <span className="text-lg font-bold text-neutral-900">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            onClick={() => setShowDepositModal(true)}
            className="bg-neutral-50 -mx-4 px-4 py-3 flex justify-between items-center border-t border-neutral-200 hover:bg-neutral-100 transition w-full text-left"
          >
            <span className="font-bold text-neutral-900">Required deposit</span>
            <span className="font-bold text-neutral-900">${depositRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </button>
        </div>

        {/* Payment Actions - Stripe Connect Integration */}
        {!quote.deposit_paid && quote.deposit_amount && quote.deposit_amount > 0 && stripeConnected && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Accept Deposit Payment</h2>
            <div className="flex gap-2">
              <button
                onClick={handleStripePayment}
                disabled={processingPayment || checkingStripe}
                className="flex-1 px-4 py-2 bg-[#635BFF] text-white rounded-lg text-sm font-medium hover:bg-[#5147e5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? 'Processing...' : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                    </svg>
                    Pay with Stripe
                  </>
                )}
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-neutral-100 rounded-lg text-sm cursor-pointer hover:bg-neutral-200">
                <input
                  type="checkbox"
                  onChange={markOfflinePayment}
                  disabled={busy}
                  className="w-4 h-4"
                />
                <span className="text-xs font-medium">Mark Paid</span>
              </label>
            </div>
          </div>
        )}

        {/* Not Connected Message */}
        {!quote.deposit_paid && quote.deposit_amount && quote.deposit_amount > 0 && !stripeConnected && !checkingStripe && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-yellow-600 text-xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Stripe Account Not Connected</h3>
                <p className="text-sm text-yellow-800 mb-3">
                  To accept deposit payments, you need to connect your Stripe account in payment settings.
                </p>
                <button 
                  onClick={() => nav('/settings?view=payment')} 
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
                >
                  Connect Stripe Account
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* Notes Tab Content */}
        {activeTab === 'notes' && (
          <>
            <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-neutral-900">Notes</h2>
                {!editingNotes ? (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotes(quote?.notes || '')
                        setEditingNotes(false)
                      }}
                      className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded text-sm font-medium hover:bg-neutral-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNotes}
                      disabled={busy}
                      className="px-3 py-1.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              
              {editingNotes ? (
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this quote..."
                />
              ) : (
                <div className="text-sm text-neutral-700 whitespace-pre-wrap min-h-[8rem]">
                  {notes || <span className="text-neutral-400 italic">No notes yet. Click Edit to add notes.</span>}
                </div>
              )}
            </div>

            {/* Video & Photo Upload */}
            <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
              <MediaUpload
                quoteId={id}
                videoUrl={videoUrl}
                photos={photos}
                onVideoChange={setVideoUrl}
                onPhotosChange={setPhotos}
              />
            </div>
          </>
        )}
          </>
        )}

        {/* Service Selector Modal */}
        {showServiceSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowServiceSelector(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-96 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-neutral-200">
                <h3 className="font-semibold">Select Service or Product</h3>
                <button
                  type="button"
                  onClick={() => setShowServiceSelector(false)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {[...savedServices, ...savedProducts].length === 0 ? (
                  <div className="p-4 text-center text-sm text-neutral-600">
                    No services or products yet. Add some in Settings.
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-200">
                    {[...savedServices, ...savedProducts].map(service => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addServiceToQuote(service)}
                        disabled={busy}
                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors disabled:opacity-40"
                      >
                        <p className="text-sm font-medium text-neutral-900">{service.name}</p>
                        <p className="text-xs text-neutral-600">${service.price.toFixed(2)}</p>
                        {service.description && <p className="text-xs text-neutral-500 mt-1">{service.description}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDepositModal(false)}>
            <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Set Required Deposit</h2>
              
              <div className="mb-4">
                <label className="block text-sm text-neutral-600 mb-2">Deposit Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDepositType('percentage')}
                    className={`flex-1 px-4 py-2 rounded text-sm font-medium ${depositType === 'percentage' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                  >
                    Percentage
                  </button>
                  <button
                    onClick={() => setDepositType('dollar')}
                    className={`flex-1 px-4 py-2 rounded text-sm font-medium ${depositType === 'dollar' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}
                  >
                    Dollar Amount
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm text-neutral-600 mb-2">
                  {depositType === 'percentage' ? 'Percentage of Subtotal' : 'Dollar Amount'}
                </label>
                <div className="flex gap-2 items-center">
                  {depositType === 'dollar' && <span className="text-neutral-600">$</span>}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={depositType === 'percentage' ? '100' : undefined}
                    className="flex-1 px-3 py-2 rounded border border-neutral-300"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    placeholder={depositType === 'percentage' ? '0' : '0.00'}
                  />
                  {depositType === 'percentage' && <span className="text-neutral-600">%</span>}
                </div>
                {depositType === 'percentage' && (
                  <p className="text-xs text-neutral-500 mt-2">
                    = ${((subtotal * parseFloat(depositValue || '0')) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg font-medium hover:bg-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDeposit}
                  disabled={busy}
                  className="flex-1 px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* On My Way Modal */}
        {showOnMyWayModal && quote.clients && (
          <OnMyWayModal
            clientName={quote.clients.name}
            clientPhone={quote.clients.phone || null}
            address={quote.clients.address || null}
            onClose={() => setShowOnMyWayModal(false)}
          />
        )}

        {/* Send Quote Modal */}
        {showSendModal && quote.clients && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSendModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Send Quote</h2>
                <button onClick={() => setShowSendModal(false)} className="text-neutral-400 hover:text-neutral-600 text-xl leading-none">&times;</button>
              </div>

              <p className="text-sm text-neutral-600 mb-6">
                Send quote to {quote.clients.name}
              </p>

              <div className="space-y-3">
                {quote.clients.phone && (
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/quotes/view/${id}`
                      const message = `Your quote from ${companyName} is ready for viewing and approval at ${shareUrl}`
                      window.open(`sms:${quote.clients.phone}?body=${encodeURIComponent(message)}`, '_blank')
                      setShowSendModal(false)
                      updateStatus('sent', total)
                    }}
                    className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800"
                  >
                    Send via Text
                  </button>
                )}
                {quote.clients.email && (
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/quotes/view/${id}`
                      const subject = `Quote from ${companyName}`
                      const body = `Your quote from ${companyName} is ready for review: ${shareUrl}`
                      window.open(`mailto:${quote.clients.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
                      setShowSendModal(false)
                      updateStatus('sent', total)
                    }}
                    className="w-full px-4 py-3 bg-neutral-900 text-white rounded-lg text-sm font-semibold hover:bg-neutral-800"
                  >
                    Send via Email
                  </button>
                )}
                <button
                  onClick={() => {
                    copyShareableLink()
                    setShowSendModal(false)
                  }}
                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-lg text-sm font-semibold hover:bg-neutral-50"
                >
                  {copied ? 'Link Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </AppLayout>
  )
}


