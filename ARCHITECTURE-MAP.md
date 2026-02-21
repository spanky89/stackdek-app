# StackDek App Architecture Map

## The "2 Different New Quote Things" Explained

You're seeing **Pages** vs **Components** - a clean separation:

### Quote Creation Flow
```
Route: /quotes/create
    ↓
📄 CreateQuotePage (pages/CreateQuote.tsx)
    - Handles navigation (back button)
    - Wraps everything in AppLayout
    - Passes onSuccess callback
    ↓
📦 CreateQuoteForm (components/CreateQuoteForm.tsx)
    - All the actual logic (client select, line items, etc.)
    - Reusable component (could be used elsewhere)
    - Saves to database
    - Calls onSuccess() when done
```

**Why 2 files?**
- **Page** = thin wrapper for routing/layout
- **Form** = reusable business logic
- Same pattern used throughout app (CreateJob, CreateInvoice, etc.)

---

## Full App Structure

### 🏗️ Main Layers

```
User
  ↓
App.tsx (Router + Auth)
  ↓
ProtectedRoute (Auth Guard)
  ↓
CompanyProvider (Context: which company user belongs to)
  ↓
SubscriptionBlockGuard (Blocks expired subscriptions)
  ↓
AppLayout (Header + BottomMenu wrapper)
  ↓
Individual Pages
```

---

## 📁 File Organization

### **Pages** (`src/pages/`)
Routes that users navigate to. Each corresponds to a URL.

| Page File | Route | What It Does |
|-----------|-------|--------------|
| `Landing.tsx` | `/` | Public landing page |
| `Login.tsx` | `/login` | Sign in |
| `Home.tsx` | `/home` | Dashboard |
| `JobStack.tsx` | `/jobs` | Kanban board |
| `QuoteList.tsx` | `/quotes` | List all quotes |
| `QuoteDetail.tsx` | `/quote/:id` | View single quote |
| `QuoteEditPage.tsx` | `/quote/:id/edit` | Edit existing quote |
| `CreateQuote.tsx` | `/quotes/create` | **NEW QUOTE** |
| `QuotePublicView.tsx` | `/quotes/view/:id` | Public quote view (clients see this) |
| `ClientList.tsx` | `/clients` | List all clients |
| `ClientDetail.tsx` | `/client/:id` | View single client |
| `CreateClient.tsx` | `/clients/create` | Add new client |
| `InvoiceList.tsx` | `/invoices` | List all invoices |
| `InvoiceDetail.tsx` | `/invoice/:id` | View single invoice |
| `CreateInvoice.tsx` | `/invoices/create` | New invoice |
| `RequestList.tsx` | `/requests` | Service requests |
| `Settings.tsx` | `/settings` | User settings |
| `BillingSettings.tsx` | `/settings/billing` | Stripe payment settings |
| `Admin.tsx` | `/admin` | Admin dashboard |

### **Components** (`src/components/`)
Reusable UI pieces used by pages.

| Component | Used By | Purpose |
|-----------|---------|---------|
| `AppLayout.tsx` | All protected pages | Header + bottom menu wrapper |
| `Header.tsx` | AppLayout | Top nav bar |
| `BottomMenu.tsx` | AppLayout | Mobile bottom nav |
| `CreateQuoteForm.tsx` | CreateQuotePage | **QUOTE CREATION LOGIC** |
| `CreateJobForm.tsx` | CreateJobPage | Job creation logic |
| `CreateClientForm.tsx` | CreateClientPage | Client creation logic |
| `LineItemCard.tsx` | Quote/Job/Invoice forms | Display line items |
| `SendInvoiceModal.tsx` | InvoiceDetail | Send invoice popup |
| `SendViaTextModal.tsx` | QuoteDetail | Send quote via SMS |
| `DocumentHeader.tsx` | Quote/Invoice views | Branded header |
| `DocumentSummary.tsx` | Quote/Invoice views | Totals breakdown |
| `SubscriptionGuard.tsx` | Various pages | Shows paywall when needed |
| `AdminGuard.tsx` | Admin pages | Only admins can access |

### **Context** (`src/context/`)
Global state management.

| File | What It Provides |
|------|------------------|
| `CompanyContext.tsx` | Current user's company ID (used everywhere) |

### **API** (`src/api/`)
Backend connection.

| File | Purpose |
|------|---------|
| `supabaseClient.ts` | Configured Supabase client |

### **Hooks** (`src/hooks/`)
Reusable logic.

| Hook | What It Does |
|------|--------------|
| `useEnsureCompany.ts` | Creates company if user doesn't have one |
| `useSubscription.ts` | Checks if user has active subscription |
| `useListFilter.ts` | Search/filter logic for lists |

---

## 🔄 Data Flow Example: Creating a Quote

```
1. User clicks "New Quote" in QuoteList
   ↓
2. Navigate to /quotes/create
   ↓
3. CreateQuotePage loads
   ↓
4. CreateQuoteForm renders inside it
   ↓
5. Form loads:
   - Fetches clients from Supabase
   - Loads saved services/products
   - Prefills client if URL param exists (?clientId=123)
   ↓
6. User adds line items:
   - Can add from library (services/products)
   - Can add custom items
   - Each opens LineItemEditor modal
   ↓
7. User clicks "Send Quote"
   ↓
8. Form saves to Supabase:
   a. Insert into `quotes` table
   b. Insert line items into `quote_line_items` table
   ↓
9. onSuccess() callback fires
   ↓
10. Navigate back to /quotes
```

---

## 🔗 How Quote → Job → Invoice Flow Works

### Quote Approval Creates Job
```
QuoteDetail.tsx
  ↓ User clicks "Approve Quote"
  ↓
Copies all line items
  ↓
Creates new Job with same data
  ↓
Navigates to /job/:id
```

### Job → Invoice
```
JobDetail.tsx
  ↓ User clicks "Create Invoice"
  ↓
Redirects to /invoices/create?jobId=123
  ↓
CreateInvoiceForm prefills from job
  ↓
Line items copy over automatically
```

---

## 🎯 Key Patterns

### 1. Page + Form Pattern
Most create/edit flows follow this:
- **Page** = routing/layout/navigation
- **Form** = logic/state/database

### 2. Detail Pages
View a single item:
- Fetch from Supabase by ID
- Show all related data (client, line items, etc.)
- Action buttons (Edit, Delete, Send, etc.)

### 3. List Pages
Show multiple items:
- Fetch all for current company
- Filter/search (using `useListFilter`)
- Click to navigate to detail page

### 4. Modal Components
Overlays for actions:
- `SendInvoiceModal` - email/SMS invoice
- `SendViaTextModal` - send quote
- `OnMyWayModal` - notify client you're arriving

### 5. Protected Routes
All app routes require:
1. Authentication (session exists)
2. Company association (user belongs to a company)
3. Active subscription (not expired)

---

## 📊 Database Tables Used

| Table | What It Stores |
|-------|----------------|
| `companies` | Business info (name, address, logo) |
| `clients` | Customer records |
| `quotes` | Quote records |
| `quote_line_items` | Items in each quote |
| `jobs` | Active work |
| `job_line_items` | Items in each job |
| `invoices` | Invoices sent |
| `invoice_line_items` | Items in each invoice |
| `services` | Saved service catalog |
| `products` | Saved product catalog |
| `requests` | Service requests from clients |
| `tasks` | Recurring tasks |

---

## 🧩 Why This Structure?

**Separation of Concerns:**
- Pages = navigation/routing
- Components = reusable UI logic
- Hooks = reusable business logic
- Context = global state

**Benefits:**
- Easy to find code (page vs component)
- Reusable forms (can use CreateQuoteForm anywhere)
- Clean routing (App.tsx is just routes)
- Single source of truth (CompanyContext)

**Example:** If you wanted to add "Create Quote" button to ClientDetail page, you'd just:
```tsx
import CreateQuoteForm from '../components/CreateQuoteForm'

// Inside ClientDetail:
<CreateQuoteForm 
  prefilledClientId={clientId}
  onSuccess={() => navigate('/quotes')}
/>
```

---

## 🚀 Quick Reference

**Want to add a new page?**
1. Create `src/pages/MyNewPage.tsx`
2. Add route in `App.tsx`
3. Add link in `BottomMenu.tsx` or `Header.tsx`

**Want to add a new feature?**
1. Create component in `src/components/MyFeature.tsx`
2. Import it into the page that needs it
3. Connect to Supabase in the component

**Want to modify quote creation?**
- Logic = `components/CreateQuoteForm.tsx`
- Layout = `pages/CreateQuote.tsx`
- Database = Supabase `quotes` + `quote_line_items` tables

---

**Questions?** This is your map. The "2 different new quote things" are just the page wrapper vs the actual form - same pattern used everywhere.
