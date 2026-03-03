# Pro Features Build Plan - March 2026

**Branch:** `pro-features`  
**Target:** $69/month Pro tier  
**Focus:** Contracts + Multi-User (10 users max)

---

## 🎯 Feature 1: Contract Signing

### User Flow:
1. **Admin uploads contract PDF** when creating/editing quote
2. **Quote sent to client** includes contract attachment
3. **Client views quote** → clicks "Accept Quote" button
4. **Signature modal pops up** → client signs on screen
5. **Quote + Signed Contract** saved, status changes to "Accepted"
6. **Admin sees signed contract** in quote details

### Database Changes:

**`quotes` table - add columns:**
```sql
ALTER TABLE quotes ADD COLUMN contract_url TEXT;           -- Uploaded PDF URL
ALTER TABLE quotes ADD COLUMN contract_signed_url TEXT;    -- Signed PDF URL
ALTER TABLE quotes ADD COLUMN contract_signed_at TIMESTAMP; -- When signed
ALTER TABLE quotes ADD COLUMN signature_data TEXT;         -- JSON signature info
```

**Storage buckets needed:**
- `quote-contracts` (public) - Uploaded contract PDFs
- `signed-contracts` (private) - Signed versions with customer signature

### UI Components to Build:

1. **CreateQuote/EditQuote pages:**
   - Add "Upload Contract (Optional)" file input
   - Preview uploaded PDF
   - Remove/replace contract

2. **QuotePublicView page (client-facing):**
   - Show "Contract included" indicator
   - "View Contract" button (opens PDF in new tab)
   - "Accept Quote & Sign Contract" button (opens signature modal)

3. **SignatureModal component:**
   - Canvas for drawing signature
   - "Clear" and "Sign" buttons
   - Captures signature as image
   - Overlays signature on contract PDF
   - Saves signed version

4. **QuoteDetail page (admin view):**
   - Show contract status (unsigned/signed)
   - Download original contract
   - Download signed contract (if signed)
   - Show signature timestamp + client name

### Files to Create/Modify:

**New Files:**
- `src/components/ContractUpload.tsx` - Contract upload UI
- `src/components/SignatureModal.tsx` - Signature canvas modal
- `src/utils/pdfSignature.ts` - PDF manipulation (add signature)
- `migrations/12_add_contract_fields.sql` - Database changes

**Modified Files:**
- `src/pages/CreateQuote.tsx` - Add contract upload
- `src/pages/QuoteEditPage.tsx` - Add contract upload
- `src/pages/QuotePublicView.tsx` - Add signature flow
- `src/pages/QuoteDetail.tsx` - Display contract status

### Technical Stack:
- **PDF viewing:** `react-pdf` or `pdf-lib`
- **Signature canvas:** HTML5 Canvas API
- **PDF manipulation:** `pdf-lib` (add signature to PDF)
- **Storage:** Supabase Storage buckets

---

## 👥 Feature 2: Multi-User Management

### User Roles:

**Owner (existing):**
- Full access to everything
- Can delete account
- Manages team members

**Manager (new - Pro only):**
- Access to all jobs, clients, quotes, invoices
- Can create/edit/delete everything
- **Cannot:** Delete company account or change subscription
- **Can:** Add/remove employees, assign jobs

**Employee (new - Pro only):**
- Only sees jobs/tasks assigned to them
- Sees line items but **NOT prices**
- Main screen: My Tasks + My Jobs
- **Clock in/out** functionality
- Cannot access: Clients list, Settings, Billing, Admin dashboard

### Database Changes:

**New `team_members` table:**
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Invitations (pending team members)
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**New `job_assignments` table:**
```sql
CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(job_id, team_member_id)
);
```

**New `time_entries` table (clock in/out):**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  clock_in TIMESTAMP NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### UI Components to Build:

**New Pages:**
1. **EmployeeDashboard.tsx** - Employee-specific home screen
   - "My Jobs" section (only assigned jobs)
   - "My Tasks" section (only assigned tasks)
   - Clock in/out widget
   - Hours worked this week

2. **TeamManagement.tsx** - Owner/Manager page
   - List all team members
   - Invite new members (email input)
   - Change roles
   - Deactivate members
   - View member activity

3. **JobAssignments.tsx** (or section in JobDetail)
   - Assign employees to job
   - Unassign employees
   - See who's working on what

**New Components:**
1. **ClockInOut.tsx** - Clock in/out widget
   - Big "Clock In" / "Clock Out" button
   - Shows current status (clocked in/out)
   - Shows today's hours

2. **TeamMemberCard.tsx** - Display team member info
   - Name, email, role badge
   - Active/inactive status
   - Actions (edit, remove)

3. **RoleGuard.tsx** - Wrapper for role-based features
   - Similar to SubscriptionGuard
   - Checks user role before showing component

### Modified Files:
- `src/App.tsx` - Add routes for employee dashboard, team management
- `src/components/Header.tsx` - Show employee dashboard link for employees
- `src/pages/JobDetail.tsx` - Add assignment section
- `src/pages/QuoteDetail.tsx` - Hide prices for employees
- `src/pages/InvoiceDetail.tsx` - Hide prices for employees

### Permission Logic:

**Employee sees:**
- Jobs assigned to them (only)
- Tasks assigned to them (only)
- Line item descriptions (NO PRICES)
- Clock in/out
- Cannot access: Clients, Quotes, Invoices, Settings

**Manager sees:**
- Everything Owner sees
- Except: Billing, Subscription settings, Delete account

**Access Control Pattern:**
```tsx
// In every component
const { user, role } = useAuth();

if (role === 'employee') {
  // Show employee-specific view
} else {
  // Show full view
}
```

---

## 🔒 Pro Feature Gating

**Wrap team management behind Pro subscription:**

```tsx
<SubscriptionGuard feature="multi_user">
  <TeamManagement />
</SubscriptionGuard>
```

**Show upgrade prompt for Starter users:**
- Settings page: "Team Members" section locked
- Show: "Upgrade to Pro to add team members (up to 10)"
- Click → Upgrade modal

---

## 📋 Implementation Phases

### Phase 1: Contracts (Week 1)
**Day 1-2:** Database + Storage
- [x] Create migration `12_add_contract_fields.sql`
- [ ] Create storage buckets (quote-contracts, signed-contracts)
- [ ] Test upload/download

**Day 3-4:** Upload & Display
- [ ] Build `ContractUpload` component
- [ ] Add to CreateQuote/EditQuote pages
- [ ] Display on QuotePublicView page

**Day 5-7:** Signature Flow
- [ ] Build `SignatureModal` component
- [ ] Integrate pdf-lib for signature overlay
- [ ] Save signed contract to storage
- [ ] Update quote status on signing
- [ ] Display signed contract in QuoteDetail

### Phase 2: Multi-User (Week 2)
**Day 1-2:** Database + Auth
- [ ] Create `team_members`, `team_invitations`, `job_assignments`, `time_entries` tables
- [ ] Build invitation system (email with token link)
- [ ] Add RLS policies for role-based access

**Day 3-4:** Team Management UI
- [ ] Build TeamManagement page
- [ ] Build invitation flow
- [ ] Build role management

**Day 5-7:** Employee Experience
- [ ] Build EmployeeDashboard page
- [ ] Build ClockInOut widget
- [ ] Build JobAssignments UI
- [ ] Filter jobs/tasks by employee
- [ ] Hide prices for employees

---

## 🚀 Testing Checklist

### Contracts:
- [ ] Upload PDF contract to quote
- [ ] View quote as client (public URL)
- [ ] Sign contract in signature modal
- [ ] Verify signed contract saved
- [ ] Download signed contract as admin
- [ ] Ensure non-Pro users can't upload contracts

### Multi-User:
- [ ] Invite manager → accept invite → verify access
- [ ] Invite employee → accept invite → verify limited access
- [ ] Assign employee to job → verify they see it
- [ ] Clock in as employee → verify time recorded
- [ ] Clock out as employee → verify hours calculated
- [ ] Verify employee can't see prices
- [ ] Verify manager can access everything
- [ ] Ensure Starter users can't add team members

---

## 📊 Success Metrics

**Contracts:**
- % of quotes with contracts attached
- % of contracts signed (conversion rate)
- Time to signature (speed of acceptance)

**Multi-User:**
- Average team size (Pro users)
- Employee clock-in usage rate
- Job completion time (with vs without assignments)

---

## 🎨 UI/UX Notes

**Contract Upload:**
- Drag-and-drop PDF upload
- Show PDF thumbnail preview
- "Replace Contract" button if already uploaded
- File size limit: 10MB

**Signature Modal:**
- Full-screen overlay
- Canvas for drawing signature
- Touch-friendly (mobile signatures)
- "Clear" button to redraw
- "Cancel" and "Sign & Accept" buttons

**Employee Dashboard:**
- Big clock in/out button (primary CTA)
- Card-based layout for jobs/tasks
- No dollar signs visible anywhere
- Simple, focused interface

**Team Management:**
- Table view of all members
- Role badges (Owner/Manager/Employee)
- Quick actions (Edit, Remove, Resend invite)
- "Invite Team Member" prominent button

---

## ⚠️ Edge Cases to Handle

**Contracts:**
- What if client closes signature modal? → Save draft, allow resume
- What if contract upload fails? → Show error, allow retry
- Can admin change contract after sent? → Yes, but log changes
- Can client download unsigned contract? → Yes

**Multi-User:**
- Max 10 users on Pro → Show count, disable invite when at limit
- Employee tries to access restricted page → Redirect to employee dashboard with message
- Owner downgrades to Starter → Deactivate all team members, preserve data
- Employee deleted mid-job → Unassign from all jobs, keep time entries

---

## 🛠️ Libraries Needed

```bash
npm install pdf-lib        # PDF manipulation
npm install react-pdf      # PDF viewing (optional)
npm install signature_pad  # Signature canvas (optional, can use raw Canvas)
```

---

## Next Steps

1. **Switch to pro-features branch:** `git checkout pro-features`
2. **Start with contracts** (simpler, visual impact)
3. **Build + test on preview URL**
4. **Get your feedback**
5. **Polish + iterate**
6. **Move to multi-user**

Ready to start building?
