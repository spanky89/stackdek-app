import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'

type Section = 'getting-started' | 'quotes' | 'jobs' | 'clients' | 'invoicing' | 'settings' | 'faq' | 'support'

export default function HelpPage() {
  const nav = useNavigate()
  const [activeSection, setActiveSection] = useState<Section>('getting-started')

  const sections = [
    { id: 'getting-started' as Section, label: 'Getting Started', icon: '🚀' },
    { id: 'quotes' as Section, label: 'Creating Quotes', icon: '📝' },
    { id: 'jobs' as Section, label: 'Managing Jobs', icon: '📋' },
    { id: 'clients' as Section, label: 'Clients', icon: '👥' },
    { id: 'invoicing' as Section, label: 'Invoicing', icon: '💰' },
    { id: 'settings' as Section, label: 'Settings', icon: '⚙️' },
    { id: 'faq' as Section, label: 'FAQ', icon: '❓' },
    { id: 'support' as Section, label: 'Support', icon: '💬' },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <Header />

        <div className="mb-6">
          <button
            onClick={() => nav('/home')}
            className="text-sm text-neutral-600 hover:text-neutral-900 transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-200">
            <h1 className="text-2xl font-bold text-neutral-900">Help & Documentation</h1>
            <p className="text-neutral-600 mt-1">Everything you need to know about using StackDek</p>
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <nav className="w-full md:w-64 border-r border-neutral-200 p-4 bg-neutral-50">
              <div className="space-y-1">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition ${
                      activeSection === section.id
                        ? 'bg-neutral-900 text-white'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-250px)]">
              {activeSection === 'getting-started' && <GettingStarted />}
              {activeSection === 'quotes' && <CreatingQuotes />}
              {activeSection === 'jobs' && <ManagingJobs />}
              {activeSection === 'clients' && <Clients />}
              {activeSection === 'invoicing' && <Invoicing />}
              {activeSection === 'settings' && <Settings />}
              {activeSection === 'faq' && <FAQ />}
              {activeSection === 'support' && <Support />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GettingStarted() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">🚀 Getting Started</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sign Up & Login</h3>
        <p className="text-neutral-700 mb-3">
          Create your account using email and password or Google OAuth. After signing up, you'll be redirected to complete your profile setup.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Profile Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-neutral-700">
          <li>Navigate to <strong>Settings</strong> from the header or mobile menu</li>
          <li>Add your company name, phone number, and email</li>
          <li>Upload your logo for branded quotes and invoices</li>
          <li>Set your tax rate (if applicable)</li>
          <li>Configure notification preferences</li>
        </ol>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Company Information</h3>
        <p className="text-neutral-700 mb-3">
          Your company profile appears on all quotes and invoices. Make sure to:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Use a professional logo (recommended: 400×400px PNG)</li>
          <li>Add your business address (if you want it shown on documents)</li>
          <li>Include contact details clients can reach you at</li>
          <li>Keep your tax/business ID up to date</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Dashboard Overview</h3>
        <p className="text-neutral-700 mb-3">
          The home dashboard shows:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Active Jobs:</strong> Current work in progress</li>
          <li><strong>Recent Quotes:</strong> Quotes awaiting approval</li>
          <li><strong>Pending Invoices:</strong> Unpaid invoices</li>
          <li><strong>Quick Actions:</strong> Create new quotes, jobs, or invoices</li>
        </ul>
      </section>
    </div>
  )
}

function CreatingQuotes() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">📝 Creating Quotes</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Basic Quote Setup</h3>
        <ol className="list-decimal list-inside space-y-2 text-neutral-700">
          <li>Click <strong>Create Quote</strong> from the dashboard or quotes list</li>
          <li>Select or create a client</li>
          <li>Add a quote title/description</li>
          <li>Set expiration date (optional)</li>
          <li>Add line items with descriptions and pricing</li>
        </ol>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Adding Line Items</h3>
        <p className="text-neutral-700 mb-3">Each line item should include:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Description:</strong> What you're providing (e.g., "Kitchen Cabinet Install")</li>
          <li><strong>Quantity:</strong> Number of units</li>
          <li><strong>Unit Price:</strong> Cost per unit</li>
          <li><strong>Subtotal:</strong> Calculated automatically (quantity × price)</li>
        </ul>
        <p className="text-neutral-700 mt-3">
          Tax is automatically calculated based on your company tax rate set in Settings.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sending Quotes</h3>
        <p className="text-neutral-700 mb-3">You can send quotes via:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Email:</strong> Sends a professional email with a link to view the quote</li>
          <li><strong>SMS:</strong> Text message with quote link (requires Twilio setup)</li>
          <li><strong>Copy Link:</strong> Share the quote URL manually</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Quote Status</h3>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Draft:</strong> Still being edited</li>
          <li><strong>Sent:</strong> Delivered to client, awaiting response</li>
          <li><strong>Approved:</strong> Client accepted the quote</li>
          <li><strong>Rejected:</strong> Client declined</li>
        </ul>
      </section>
    </div>
  )
}

function ManagingJobs() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">📋 Managing Jobs</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Kanban Board</h3>
        <p className="text-neutral-700 mb-3">
          The Jobs page displays a Kanban board with drag-and-drop columns:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Scheduled:</strong> Jobs planned but not yet started</li>
          <li><strong>In Progress:</strong> Currently active work</li>
          <li><strong>Waiting:</strong> Paused or awaiting materials/approval</li>
          <li><strong>Complete:</strong> Finished jobs</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Creating Jobs</h3>
        <p className="text-neutral-700 mb-3">Jobs can be created from:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Approved Quotes:</strong> Click "Convert to Job" on quote detail page</li>
          <li><strong>Client Requests:</strong> Convert request into a job</li>
          <li><strong>Manual:</strong> Create standalone job from Jobs page</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Status Workflow</h3>
        <p className="text-neutral-700 mb-3">
          Move jobs between stages by dragging cards or updating status in the job detail page. Status changes automatically update:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Last updated timestamp</li>
          <li>Kanban column position</li>
          <li>Client notifications (if enabled)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Job Timeline</h3>
        <p className="text-neutral-700 mb-3">
          Each job tracks:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Start date (when moved to In Progress)</li>
          <li>Completion date (when marked Complete)</li>
          <li>Total time in each status</li>
          <li>Related quotes and invoices</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Job Details</h3>
        <p className="text-neutral-700 mb-3">
          On the job detail page you can:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Add notes and updates</li>
          <li>Upload photos and documents</li>
          <li>Track hours worked</li>
          <li>Create invoices from the job</li>
          <li>Send "On My Way" notifications to clients</li>
        </ul>
      </section>
    </div>
  )
}

function Clients() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">👥 Clients</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Adding Clients</h3>
        <p className="text-neutral-700 mb-3">Add clients via:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Manual Entry:</strong> Click "Create Client" and fill in details</li>
          <li><strong>During Quote/Job Creation:</strong> Add client inline while creating work</li>
          <li><strong>CSV Import:</strong> Bulk upload from spreadsheet (Settings → Import)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Client Information</h3>
        <p className="text-neutral-700 mb-3">Required fields:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Name:</strong> Client's full name or company</li>
          <li><strong>Email:</strong> For sending quotes and invoices</li>
        </ul>
        <p className="text-neutral-700 mt-3">Optional but recommended:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Phone number (for SMS notifications)</li>
          <li>Address (for job site reference)</li>
          <li>Notes (preferences, access codes, etc.)</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Job History</h3>
        <p className="text-neutral-700 mb-3">
          Each client profile shows:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>All quotes sent to this client</li>
          <li>Active and completed jobs</li>
          <li>Invoice history and payment status</li>
          <li>Total revenue from client</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Editing & Deleting</h3>
        <p className="text-neutral-700 mb-3">
          You can edit client info anytime from the client detail page. Deleting a client is permanent and removes all associated quotes, jobs, and invoices. Use with caution.
        </p>
      </section>
    </div>
  )
}

function Invoicing() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">💰 Invoicing</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Creating Invoices</h3>
        <p className="text-neutral-700 mb-3">Invoices can be created from:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Completed Jobs:</strong> Click "Create Invoice" on job detail page</li>
          <li><strong>Approved Quotes:</strong> Generate invoice directly from quote</li>
          <li><strong>Manual:</strong> Create standalone invoice from Invoices page</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Invoice Details</h3>
        <p className="text-neutral-700 mb-3">Each invoice includes:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Invoice Number:</strong> Auto-generated unique ID</li>
          <li><strong>Due Date:</strong> Payment deadline</li>
          <li><strong>Line Items:</strong> Work performed with pricing</li>
          <li><strong>Subtotal, Tax, Total:</strong> Calculated automatically</li>
          <li><strong>Payment Link:</strong> Stripe checkout integration</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Stripe Checkout</h3>
        <p className="text-neutral-700 mb-3">
          When you send an invoice, clients receive a secure payment link powered by Stripe. They can:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Pay with credit/debit card</li>
          <li>See itemized breakdown</li>
          <li>Receive instant payment confirmation</li>
        </ul>
        <p className="text-neutral-700 mt-3">
          <strong>Setup:</strong> Configure Stripe in Settings → Billing to enable payments.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Payment Tracking</h3>
        <p className="text-neutral-700 mb-3">Invoice statuses:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Draft:</strong> Not yet sent to client</li>
          <li><strong>Sent:</strong> Awaiting payment</li>
          <li><strong>Paid:</strong> Payment received via Stripe</li>
          <li><strong>Overdue:</strong> Past due date and unpaid</li>
          <li><strong>Canceled:</strong> Voided or canceled</li>
        </ul>
        <p className="text-neutral-700 mt-3">
          Payments automatically update invoice status and send notifications.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sending Invoices</h3>
        <p className="text-neutral-700 mb-3">Send via:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Email:</strong> Professional invoice email with payment link</li>
          <li><strong>SMS:</strong> Text message with invoice link</li>
          <li><strong>Copy Link:</strong> Share payment link manually</li>
        </ul>
      </section>
    </div>
  )
}

function Settings() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">⚙️ Settings</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Company Branding</h3>
        <p className="text-neutral-700 mb-3">Customize how your business appears:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Company Name:</strong> Appears on all documents</li>
          <li><strong>Logo:</strong> Shown on quotes and invoices (PNG recommended)</li>
          <li><strong>Contact Info:</strong> Email, phone, address for client communication</li>
          <li><strong>Tax Rate:</strong> Automatically applied to quotes and invoices</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Notifications</h3>
        <p className="text-neutral-700 mb-3">Control when you receive alerts:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>New quote requests from clients</li>
          <li>Quote approvals/rejections</li>
          <li>Invoice payments received</li>
          <li>Job status updates</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Billing & Subscription</h3>
        <p className="text-neutral-700 mb-3">
          Manage your StackDek subscription in Settings → Billing. You can:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>View current plan and usage</li>
          <li>Update payment method</li>
          <li>Upgrade or downgrade subscription</li>
          <li>View billing history</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Preferences</h3>
        <p className="text-neutral-700 mb-3">Additional settings:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Default Terms:</strong> Standard payment terms for invoices</li>
          <li><strong>Invoice Prefix:</strong> Customize invoice numbering (e.g., "INV-")</li>
          <li><strong>Time Zone:</strong> For scheduling and timestamps</li>
          <li><strong>Currency:</strong> Default currency for quotes and invoices</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Integrations</h3>
        <p className="text-neutral-700 mb-3">Connect external services:</p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li><strong>Stripe:</strong> For payment processing</li>
          <li><strong>Twilio:</strong> For SMS quote/invoice delivery</li>
          <li><strong>Calendar:</strong> Sync jobs with Google Calendar (coming soon)</li>
        </ul>
      </section>
    </div>
  )
}

function FAQ() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">❓ Frequently Asked Questions</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Login Issues</h3>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">I forgot my password. How do I reset it?</summary>
          <p className="text-neutral-600 ml-4">
            On the login page, click "Forgot Password" and enter your email. You'll receive a password reset link within a few minutes. Check your spam folder if you don't see it.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">Google OAuth isn't working</summary>
          <p className="text-neutral-600 ml-4">
            Make sure you're allowing pop-ups from StackDek in your browser. If issues persist, try clearing your browser cache or using a different browser.
          </p>
        </details>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sending Quotes & Invoices</h3>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">My client didn't receive the quote email</summary>
          <p className="text-neutral-600 ml-4">
            Check that the email address is correct. Have the client check their spam folder. You can resend the quote from the quote detail page or copy the link and send it manually.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">Can I send quotes via text message?</summary>
          <p className="text-neutral-600 ml-4">
            Yes! SMS delivery requires Twilio integration. Set it up in Settings → Integrations, then use the "Send via SMS" option when sharing quotes or invoices.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">How do I customize quote templates?</summary>
          <p className="text-neutral-600 ml-4">
            Quote appearance is controlled by your company branding in Settings. Upload your logo and set company info to customize how quotes look to clients.
          </p>
        </details>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Payment Failures</h3>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">A client tried to pay but the payment failed</summary>
          <p className="text-neutral-600 ml-4">
            Payment failures are usually due to insufficient funds, incorrect card details, or the bank declining the charge. Have the client try a different card or contact their bank. You can view failed payment attempts in the invoice details.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">How do I refund a payment?</summary>
          <p className="text-neutral-600 ml-4">
            Refunds must be processed through your Stripe dashboard. Login to Stripe, find the payment, and issue a refund. The invoice status will automatically update in StackDek.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">When do payments show up in my bank account?</summary>
          <p className="text-neutral-600 ml-4">
            Stripe typically deposits funds within 2-7 business days depending on your account settings. Check your Stripe dashboard for exact payout schedules.
          </p>
        </details>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">General</h3>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">Can I use StackDek on mobile?</summary>
          <p className="text-neutral-600 ml-4">
            Yes! StackDek is fully responsive and works on phones and tablets. The interface adapts to smaller screens with a mobile-friendly menu and touch-optimized controls.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">How do I export my data?</summary>
          <p className="text-neutral-600 ml-4">
            You can export clients, quotes, jobs, and invoices to CSV from their respective list pages. Look for the "Export" button in the toolbar.
          </p>
        </details>
        <details className="mb-3">
          <summary className="text-neutral-700 cursor-pointer font-medium mb-2">Is my data secure?</summary>
          <p className="text-neutral-600 ml-4">
            Yes. StackDek uses industry-standard encryption, secure authentication, and is hosted on Vercel with Supabase (SOC 2 compliant). Payment data is handled entirely by Stripe and never touches our servers.
          </p>
        </details>
      </section>
    </div>
  )
}

function Support() {
  return (
    <div className="prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold text-neutral-900 mb-4">💬 Support</h2>
      
      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Contact Us</h3>
        <p className="text-neutral-700 mb-3">
          Need help? We're here for you!
        </p>
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p className="text-neutral-700 mb-2">
            <strong>Email:</strong> <a href="mailto:support@stackdek.com" className="text-blue-600 hover:underline">support@stackdek.com</a>
          </p>
          <p className="text-neutral-700 mb-2">
            <strong>Response Time:</strong> Within 24 hours on business days
          </p>
          <p className="text-neutral-700">
            <strong>Hours:</strong> Monday-Friday, 9 AM - 5 PM EST
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">What to Include</h3>
        <p className="text-neutral-700 mb-3">
          When contacting support, please include:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>A clear description of the issue</li>
          <li>Steps to reproduce the problem</li>
          <li>Screenshots (if applicable)</li>
          <li>Your account email or company name</li>
          <li>Browser and device information</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Priority Support</h3>
        <p className="text-neutral-700 mb-3">
          Premium plan subscribers receive:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Faster response times (&lt;12 hours)</li>
          <li>Phone support during business hours</li>
          <li>Dedicated account manager</li>
          <li>Setup assistance and training</li>
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Feature Requests</h3>
        <p className="text-neutral-700 mb-3">
          Have an idea for a new feature? We'd love to hear it! Send your suggestions to:
        </p>
        <p className="text-neutral-700">
          <a href="mailto:feedback@stackdek.com" className="text-blue-600 hover:underline">feedback@stackdek.com</a>
        </p>
        <p className="text-neutral-600 text-sm mt-2">
          We review all feature requests and prioritize based on user demand and feasibility.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Community</h3>
        <p className="text-neutral-700 mb-3">
          Join other StackDek users:
        </p>
        <ul className="list-disc list-inside space-y-1 text-neutral-700">
          <li>Share tips and workflows</li>
          <li>Get advice from experienced contractors</li>
          <li>Beta test new features</li>
          <li>Vote on roadmap priorities</li>
        </ul>
        <p className="text-neutral-700 mt-3">
          Coming soon: StackDek Community Forum
        </p>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">System Status</h3>
        <p className="text-neutral-700 mb-3">
          Check real-time system status and uptime at:
        </p>
        <p className="text-neutral-700">
          <a href="https://status.stackdek.com" className="text-blue-600 hover:underline">status.stackdek.com</a>
        </p>
        <p className="text-neutral-600 text-sm mt-2">
          Subscribe to status updates to get notified of any service disruptions.
        </p>
      </section>
    </div>
  )
}
