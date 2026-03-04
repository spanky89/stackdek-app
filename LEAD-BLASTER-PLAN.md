# Lead Blaster - Sales Outreach Tool

**Scheduled Build:** March 4, 2026 @ 4:30 AM EST  
**Duration:** 2-3 hours  
**Status:** Scheduled

---

## 🎯 Concept

**Simple lead outreach app for calling/texting 18k contractor leads.**

**Key Innovation:**
- NO autodialers (TCPA compliant)
- Uses native phone apps (tel: and sms: URLs)
- Tracks progress without complex backend
- Mobile-first (where you'll actually use it)

---

## ✨ Features

### **Core Functionality**

**1. Lead Upload**
- Drag-drop CSV file
- Auto-detect columns (name, phone, company, email, address)
- Support for 18k+ leads
- Preview before import

**2. Lead Card Interface**
```
┌─────────────────────────────────────────┐
│ 🏢 ABC Landscaping                      │
│ 📞 John Smith • (770) 555-1234          │
│ 📧 john@abclandscaping.com              │
│ 📍 Cumming, GA                          │
│                                         │
│ [📞 Call] [💬 Text] [✅ Mark Done]      │
│                                         │
│ Status: Not Contacted                   │
│ Calls: 0 • Texts: 0                     │
│ Last: Never                             │
│                                         │
│ 📝 Notes: ____________________          │
└─────────────────────────────────────────┘
```

**3. Call Button**
- Click → `tel:+17705551234` opens phone dialer
- After call: Prompt for result
  - ✅ Answered - Interested
  - 📞 Answered - Not Interested
  - 📧 Voicemail
  - ❌ No Answer
  - 🚫 Add to DNC
- Auto-increments call count
- Records timestamp

**4. Text Button**
- Click → Modal with message templates
- Select template or write custom
- Variables: `[Name]`, `[Company]`, `[YourName]`
- Click "Send" → `sms:+17705551234?body=...` opens SMS app
- Mark as "Texted"
- Auto-increments text count

**5. Status Tracking**
- Not Contacted (default)
- Interested
- Not Interested
- Callback Later
- Do Not Call
- Deal Closed

**6. Notes & History**
- Free-text notes per lead
- Call/text history log
- Last contacted timestamp

---

## 📱 Message Templates

### **Template 1: Initial Outreach**
```
Hi [Name]! Saw [Company] online. Built a free CRM 
for contractors - handles quotes, invoices, and 
payments. Want a 2-min demo? - Jarrod @ StackDek
```

### **Template 2: Follow-Up**
```
[Name], following up on StackDek CRM. 30-day free 
trial, no credit card. Takes 2 min to set up. 
Interested?
```

### **Template 3: Value Prop**
```
[Name] - StackDek replaces QuickBooks + CRM + 
payments for $29/mo (vs $250+). Save $2,640/year. 
Want a walkthrough?
```

### **Template 4: Voicemail Follow-Up**
```
[Name], left you a voicemail about StackDek. Quick 
question: What's your biggest headache with job 
management right now?
```

**Users can edit templates or create custom messages.**

---

## 🎨 UI/UX Design

### **Layout**

**Top Bar:**
- Logo / App Name
- Upload CSV button
- Export Progress button
- Filter dropdown

**Stats Dashboard:**
```
┌────────────────────────────────────────┐
│ Total: 18,000  • Contacted: 143        │
│ Interested: 12 • Callbacks: 8          │
│ Closed: 2      • DNC: 5                │
└────────────────────────────────────────┘
```

**Filters:**
- All Leads
- Not Contacted
- Interested
- Callbacks Scheduled
- Do Not Call
- Closed Deals

**Lead List:**
- Infinite scroll
- Mobile-optimized cards
- Quick actions visible

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (fast builds)
- TailwindCSS (matching StackDek style)
- Papa Parse (CSV parsing)
- LocalStorage API (data persistence)

**No Backend Required:**
- All data stored in browser LocalStorage
- Export to CSV for backup
- Works offline

**Mobile Integration:**
- `tel:` protocol for calls
- `sms:` protocol for texts
- Responsive design (mobile-first)

**Hosting:**
- Vercel (free tier)
- Custom domain optional

---

## 📊 Data Structure

### **Lead Object:**
```typescript
interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  
  // Tracking
  status: 'not_contacted' | 'interested' | 'not_interested' | 'callback' | 'dnc' | 'closed';
  callCount: number;
  textCount: number;
  lastContacted: string | null;
  notes: string;
  
  // History
  history: ContactEvent[];
}

interface ContactEvent {
  type: 'call' | 'text';
  result: string;
  timestamp: string;
  notes?: string;
}
```

---

## 🚀 Build Plan (2-3 Hours)

### **Phase 1: Core Upload & Display (45 min)**
- [ ] Create React + Vite project
- [ ] CSV upload component (drag-drop)
- [ ] Parse CSV with Papa Parse
- [ ] Display leads in card format
- [ ] Basic mobile layout

### **Phase 2: Call/Text Actions (45 min)**
- [ ] Call button → `tel:` link
- [ ] Text button → Modal with templates
- [ ] SMS link generation with pre-filled message
- [ ] Result tracking after call
- [ ] Increment counters

### **Phase 3: Status & Tracking (45 min)**
- [ ] Status dropdown per lead
- [ ] Notes field (auto-save to LocalStorage)
- [ ] Call/text history log
- [ ] Last contacted timestamp
- [ ] Filter by status

### **Phase 4: Polish & Deploy (30 min)**
- [ ] Stats dashboard (top bar)
- [ ] Export to CSV functionality
- [ ] Mobile optimizations
- [ ] Deploy to Vercel
- [ ] Test on phone

---

## 💡 Future Enhancements (Post-MVP)

**Phase 2:**
- Calendar integration (schedule callbacks)
- Bulk actions (mark 10 as DNC)
- Search/sort leads
- Import from Google Sheets

**Phase 3:**
- Add to StackDek as "Lead Manager" feature
- Charge $10-15/mo for contractors
- CRM integration (lead → client conversion)

**Phase 4:**
- Team mode (multiple users)
- Call recording notes
- Analytics dashboard

---

## 📈 Expected Results

**With 18k leads:**
- 100 calls/day = 180 days to contact all
- 5-10% interested = 900-1,800 warm leads
- 10-20% conversion = 90-360 customers
- At $29/mo = **$2,610-10,440/month recurring**

**With Lead Blaster:**
- Track progress
- Don't double-call
- Consistent messaging
- Professional follow-up

---

## 🎯 Success Metrics

**MVP Success:**
- ✅ Upload 18k leads without lag
- ✅ Call/text buttons work on mobile
- ✅ Status tracking persists in LocalStorage
- ✅ Export progress as CSV
- ✅ Filter by status works

**Business Success:**
- 10+ interested leads per day
- 2-3 demos scheduled per day
- 5-10 signups per week
- Positive ROI within 30 days

---

## 📝 Notes

**Why This Works:**
1. **TCPA Compliant** - No autodialers, you manually initiate
2. **Zero API Costs** - Uses native phone apps
3. **Simple** - No complex backend or auth
4. **Mobile-First** - Where you'll actually use it
5. **Trackable** - Don't lose progress

**Why Not Use Existing Tools?**
- Salesforce/HubSpot = $50-100/mo, overkill
- Close.com/Aircall = $30-90/user/mo, need dialer
- This = Free, purpose-built, no monthly fees

**Potential SaaS Product:**
- Sell to other contractors/sales teams
- $10-20/mo per user
- Simple, focused, mobile-first
- Could be $50k/year side business

---

**Build starts:** 4:30 AM EST, March 4, 2026  
**Ship by:** 7:00 AM EST  
**Deploy:** Vercel (lead-blaster.vercel.app)  
**First test:** Your 18k contractor leads

Let's convert some leads! 💰📞
