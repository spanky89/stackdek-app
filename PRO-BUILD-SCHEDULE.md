# Pro Features Build Schedule - March 3, 2026

**Branch:** `pro-features` (isolated, won't touch main)  
**Time:** 5:40 PM - 7:30 PM EST (110 minutes)  
**Strategy:** NEW pages/components only, NO edits to existing working pages

---

## 🎯 Build Strategy (Safe Approach)

### What We're BUILDING:
- ✅ **New pages** (TeamManagement, EmployeeDashboard, etc.)
- ✅ **New components** (ContractUpload, SignatureModal, ClockInOut, etc.)
- ✅ **New utility files** (pdfSignature.ts, roleGuards.ts)

### What We're NOT TOUCHING:
- ❌ Existing working pages (Home, JobDetail, QuoteDetail, etc.)
- ❌ Database (migrations saved for last)
- ❌ Existing components (Header, AppLayout, etc.)

### Testing Strategy:
- Use **mock data** initially (no database needed)
- Build UI-first, wire up database later
- Preview on: `stackdek-app-git-pro-features-spanky89.vercel.app`

---

## 📅 Detailed Schedule

### **5:40 PM - 6:10 PM** (30 min) - Contract Upload UI

**Goal:** Upload contract PDF to quote (UI only, mock data)

**Files to Create:**
1. `src/components/ContractUpload.tsx` - Drag-and-drop PDF upload
2. `src/components/ContractPreview.tsx` - Show uploaded PDF thumbnail
3. `src/pages/ContractDemo.tsx` - Demo page to test contract upload

**Deliverable:**
- Working upload component (saves to localStorage temporarily)
- Can drag/drop PDF, see preview, remove it
- Test on `/contract-demo` route

---

### **6:10 PM - 6:40 PM** (30 min) - Signature Modal

**Goal:** Draw signature on canvas, overlay on PDF preview

**Files to Create:**
1. `src/components/SignatureModal.tsx` - Canvas signature pad
2. `src/components/SignatureCanvas.tsx` - Drawing logic
3. `src/utils/signaturePad.ts` - Signature capture helpers

**Deliverable:**
- Modal pops up with canvas
- Can draw signature with mouse/touch
- "Clear" and "Sign" buttons work
- Signature saves as base64 image
- Test in ContractDemo page

---

### **6:40 PM - 7:10 PM** (30 min) - Team Management UI

**Goal:** Page to invite/manage team members (mock data)

**Files to Create:**
1. `src/pages/TeamManagement.tsx` - List team members + invite
2. `src/components/TeamMemberCard.tsx` - Display member info
3. `src/components/InviteTeamMemberModal.tsx` - Invite form
4. `src/types/teamMember.ts` - TypeScript types

**Deliverable:**
- Page at `/team` route
- Shows mock list of team members
- Can open invite modal
- Role badges (Owner/Manager/Employee)
- Mock "Remove" and "Edit" actions

---

### **7:10 PM - 7:30 PM** (20 min) - Employee Dashboard

**Goal:** Employee-specific home page (clock in/out, my jobs)

**Files to Create:**
1. `src/pages/EmployeeDashboard.tsx` - Employee home screen
2. `src/components/ClockInOut.tsx` - Clock in/out widget
3. `src/components/MyJobsWidget.tsx` - Show assigned jobs

**Deliverable:**
- Page at `/employee-dashboard` route
- Big clock in/out button
- Shows mock assigned jobs
- No prices visible anywhere
- Time tracking display (mock hours)

---

## 🛠️ Implementation Notes

### NPM Packages Needed (Install First):
```bash
npm install pdf-lib
npm install react-dropzone  # For drag-drop upload
```

### Routes to Add (App.tsx):
```tsx
// Add these routes (won't interfere with existing)
<Route path="/contract-demo" element={<ContractDemo />} />
<Route path="/team" element={<TeamManagement />} />
<Route path="/employee-dashboard" element={<EmployeeDashboard />} />
```

### Mock Data Structure:
```tsx
// Mock team members
const mockTeamMembers = [
  { id: '1', name: 'John Smith', email: 'john@example.com', role: 'manager', active: true },
  { id: '2', name: 'Jane Doe', email: 'jane@example.com', role: 'employee', active: true },
];

// Mock jobs (for employee)
const mockAssignedJobs = [
  { id: '1', title: 'Install Deck', client: 'Bob Johnson', date: '2026-03-05' },
  { id: '2', title: 'Patio Repair', client: 'Sarah Lee', date: '2026-03-07' },
];
```

---

## ✅ Success Criteria

**After 7:30 PM, we should have:**
1. ✅ Contract upload component (working with local files)
2. ✅ Signature modal (drawing works, saves image)
3. ✅ Team management page (UI complete, mock data)
4. ✅ Employee dashboard (UI complete, mock data)
5. ✅ All on `pro-features` branch
6. ✅ Preview URL deployed and testable
7. ✅ Zero changes to main branch or existing pages

**NOT done yet (saved for later):**
- ❌ Database migrations
- ❌ Stripe integration
- ❌ Supabase storage setup
- ❌ Integration with existing pages

---

## 🚀 Deployment

**Every push to `pro-features` auto-deploys to:**
`https://stackdek-app-git-pro-features-spanky89.vercel.app`

**Testing checklist:**
- [ ] Navigate to `/contract-demo` - upload PDF works
- [ ] Click "Sign" - signature modal appears
- [ ] Draw signature - saves and displays
- [ ] Navigate to `/team` - team list shows
- [ ] Click "Invite Member" - modal opens
- [ ] Navigate to `/employee-dashboard` - dashboard loads
- [ ] Click "Clock In" - button changes to "Clock Out"

---

## 📋 Work Tracking

| Time | Task | Status |
|------|------|--------|
| 5:40-6:10 | Contract Upload UI | ⏳ Pending |
| 6:10-6:40 | Signature Modal | ⏳ Pending |
| 6:40-7:10 | Team Management | ⏳ Pending |
| 7:10-7:30 | Employee Dashboard | ⏳ Pending |

**I'll update this file as I complete each section.**

---

## 🔄 After 7:30 PM

**Review session:**
1. Show you preview URL
2. Get feedback on UI/UX
3. Refine based on your input
4. Plan Phase 2 (database integration)

**Phase 2 (Later):**
- Wire up Supabase storage for contracts
- Create database migrations
- Connect team management to auth
- Add RLS policies
- Integrate with existing pages (optional)

---

**Ready to start at 5:40 PM!** 🚀
