# Marketing Suite Plan - Pro Feature

**Target Users:** Contractors who want to automate client communication and drive repeat business  
**Pricing:** Pro tier ($69/month)  
**Goal:** Replace 3-4 separate marketing tools ($60-100/month saved)

---

## 🎯 Core Features

### 1. Email Campaigns
**Use Cases:**
- Post-job follow-ups ("How did we do?")
- Seasonal reminders ("Time for spring cleanup!")
- Promotional offers ("10% off deck staining this month")
- Project updates ("Your job is scheduled for Monday")
- Review requests (automated after job completion)

**Features:**
- Visual email builder (drag-and-drop)
- Pre-built templates for contractors
- Personalization (client name, job details, etc.)
- Schedule send or send immediately
- Track opens, clicks, replies

---

### 2. SMS/Text Campaigns
**Use Cases:**
- Appointment reminders ("We'll be there tomorrow at 9 AM")
- Job updates ("Running 15 min late, be there by 9:15")
- Quick promotions ("Last-minute availability this week!")
- Payment reminders ("Invoice #123 due tomorrow")
- Emergency alerts ("Job delayed due to weather")

**Features:**
- Bulk SMS sending
- Two-way texting (clients can reply)
- Short links for quotes/invoices
- Delivery tracking
- Opt-out management (TCPA compliance)

---

### 3. Drip Campaigns (Email Sequences)
**Use Cases:**
- New client onboarding (3-5 emails over 2 weeks)
- Post-quote nurturing (follow up if quote not accepted)
- Seasonal maintenance reminders (deck care, gutter cleaning)
- Re-engagement (clients who haven't booked in 6 months)
- Upsell campaigns (offer additional services)

**Features:**
- Visual sequence builder (flowchart style)
- Trigger conditions (quote sent, job completed, X days after, etc.)
- A/B testing (test subject lines, content)
- Auto-pause if client responds
- Performance analytics per sequence

---

### 4. Automated Triggers
**Automatic messages based on events:**

**After Quote Sent:**
- Day 0: "Thanks for your interest, here's your quote"
- Day 3: "Just checking in, any questions?"
- Day 7: "This quote expires in 7 days"
- Day 14: "We'd still love to work with you" (last chance offer)

**After Job Completed:**
- Day 0: "Job complete! How did we do?"
- Day 1: "Please review us on Google" (with direct link)
- Day 7: "Thanks for choosing us! Here's 10% off your next job"
- Day 90: "Time for seasonal maintenance?"

**After Invoice Sent:**
- Day 0: "Invoice ready for payment" (with pay link)
- Day 7: "Friendly reminder: Invoice due in 7 days"
- Day 14: "Invoice #123 is past due"
- Day 21: "Final notice before late fees"

**Client Inactive:**
- 90 days: "We miss you! Here's what's new"
- 180 days: "Special offer just for you"

---

### 5. Template Library
**Pre-built messages contractors can customize:**

**Email Templates:**
- Quote follow-up
- Job completion thank you
- Review request
- Seasonal promotion
- Referral request
- Payment reminder
- Appointment confirmation
- Weather delay notice

**SMS Templates:**
- "On my way!" (auto-fill ETA)
- "Running late" (auto-fill new ETA)
- "Job completed" (link to review)
- "Invoice ready" (link to pay)
- "Appointment tomorrow" (auto-fill date/time)

**Customization:**
- Company branding (logo, colors)
- Merge fields (client name, job details, etc.)
- Save as custom templates

---

### 6. Contact Lists & Segmentation
**Smart lists based on:**
- Client status (active, inactive, past due)
- Service type (deck, fence, landscaping, etc.)
- Location (city, zip code)
- Job value (high-value clients)
- Last contact date
- Tags (VIP, referral source, seasonal, etc.)

**Use Cases:**
- Send deck staining promo to all deck clients
- Target high-value clients with premium services
- Re-engage clients who haven't booked in 6 months
- Local promotions (zip code specific)

---

### 7. Campaign Analytics
**Track Performance:**
- Open rates (email)
- Click rates (links in emails/SMS)
- Response rates
- Conversion rates (quote acceptance, review submission)
- Unsubscribe rates
- Revenue attributed to campaigns
- Best performing templates

**Dashboard:**
- Campaign performance overview
- ROI calculator (revenue vs. cost)
- Best time to send (based on open rates)
- Engagement trends over time

---

### 8. Review Request Automation
**Automatically request reviews after jobs:**
- Trigger: Job marked as "Completed"
- Delay: 1 day (let dust settle)
- Message: Personalized review request
- Links: Direct to Google, Yelp, Facebook
- Incentive: "Leave a review, get 10% off next job"

**Smart Logic:**
- Skip if client gave negative feedback
- Skip if payment is past due
- Track which clients reviewed
- Send thank-you after review left

---

### 9. Referral Program (Bonus Feature)
**Encourage word-of-mouth:**
- "Refer a friend, both get $50 off"
- Unique referral codes per client
- Track referrals (who referred who)
- Automatic discount application
- Leaderboard (top referrers)

**Automated Emails:**
- After great review: "Love our work? Refer a friend!"
- After repeat booking: "You're a VIP! Share the love"
- Monthly referral reminder

---

## 📋 Page Structure & UI

### Main Marketing Page (`/marketing`)

**Top Navigation Tabs:**
1. Dashboard (overview)
2. Email Campaigns
3. SMS Campaigns
4. Drip Sequences
5. Templates
6. Contacts & Lists
7. Analytics

---

### 1. Dashboard Tab
**Widgets:**
- Active campaigns (currently running)
- Recent sends (last 10 emails/SMS)
- Quick stats (open rate, click rate, conversions)
- Upcoming scheduled sends
- Low-balance warning (SMS credits)
- Quick actions (+ New Campaign, + New Template)

**Recent Activity Feed:**
- "Email sent to 45 clients - 'Spring Cleanup Special'"
- "SMS delivered to John Smith - 'Appointment reminder'"
- "Review received from Sarah Lee via campaign"

---

### 2. Email Campaigns Tab
**Left Sidebar:**
- + New Campaign
- Drafts (3)
- Scheduled (2)
- Sent (15)
- Templates

**Main Area:**
- Campaign list (name, status, sent to, open rate, clicks)
- Filter by status (draft, scheduled, sent)
- Search campaigns

**Campaign Builder (when creating):**
1. Choose template or start blank
2. Email editor (drag-and-drop blocks: text, image, button, divider)
3. Preview (desktop + mobile)
4. Select recipients (all clients, specific list, segment)
5. Schedule or send now
6. Review & confirm

---

### 3. SMS Campaigns Tab
**Similar to Email, but simpler:**
- Character count (160 max per message)
- Shorter templates
- Link shortener (turn long URLs into bit.ly style)
- Two-way messaging inbox (see replies)
- Opt-out management

**SMS Credits:**
- Display credit balance
- Cost per message ($0.01 - $0.03)
- Buy more credits (Stripe integration)
- Auto-reload option

---

### 4. Drip Sequences Tab
**Visual Flowchart Builder:**
- Drag-and-drop email/SMS blocks
- Connect with arrows (flow logic)
- Set delays (1 day, 3 days, 1 week, etc.)
- Add conditions (if opened, if clicked, if replied)
- Branching logic (A/B test, if/then)

**Pre-built Sequences:**
- New Client Onboarding (5 emails)
- Quote Follow-Up (4 emails)
- Post-Job Nurture (3 emails + review request)
- Re-Engagement (3 emails)
- Seasonal Maintenance (4 emails)

**Sequence Performance:**
- Step-by-step metrics (how many made it to each step)
- Drop-off points (where people stop engaging)
- Conversion rate (end goal achieved)

---

### 5. Templates Tab
**Categories:**
- Email Templates (15 pre-built)
- SMS Templates (10 pre-built)
- My Custom Templates

**Template Editor:**
- WYSIWYG editor for emails
- Simple text for SMS
- Merge fields dropdown ({{client_name}}, {{job_title}}, etc.)
- Save as new template
- Duplicate existing template

**Popular Templates:**
- "Post-Job Thank You" (most used)
- "Review Request" (highest conversion)
- "Appointment Reminder" (lowest unsubscribe)

---

### 6. Contacts & Lists Tab
**Left Sidebar:**
- All Contacts (500)
- Active Clients (320)
- Inactive Clients (180)
- High Value (50)
- By Service Type
- By Location
- Custom Lists (+ Create New)

**Main Area:**
- Contact list with filters
- Bulk actions (add to list, send campaign, export)
- Import contacts (CSV)
- Contact details (click to view full profile)

**Smart Segments:**
- Auto-updating lists based on rules
- Example: "Deck clients who haven't booked in 90 days"
- Example: "Clients with unpaid invoices"

---

### 7. Analytics Tab
**Overview Cards:**
- Total campaigns sent (245)
- Average open rate (32%)
- Average click rate (8%)
- Total revenue attributed ($42,350)

**Charts:**
- Email/SMS sends over time (line chart)
- Open rate trends (line chart)
- Campaign performance (bar chart - top 10 campaigns)
- Best day/time to send (heatmap)

**ROI Calculator:**
- Input: Campaign cost (SMS credits, time)
- Output: Revenue generated, ROI %
- Break down by campaign

**Detailed Reports:**
- Campaign-by-campaign breakdown
- Template performance
- Segment engagement
- Client activity (most engaged, least engaged)

---

## 🛠️ Technical Implementation

### Email Sending (Resend)
**Why Resend:**
- Built for developers
- 100 free emails/day (3,000/month)
- $20/month for 50,000 emails
- Custom domain support
- Excellent deliverability
- Simple API

**Features:**
- HTML email templates (React Email components)
- Click tracking
- Open tracking
- Bounce handling
- Webhook for events (delivered, opened, clicked)

**Integration:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'StackDek <hello@stackdek.com>',
  to: ['client@example.com'],
  subject: 'Thanks for choosing us!',
  html: '<p>Your job is complete...</p>',
});
```

---

### SMS Sending (Twilio)
**Why Twilio:**
- Industry standard
- $15 gets you started (includes phone number + 500 messages)
- $0.0079 per SMS (US)
- Two-way messaging
- Excellent documentation
- Webhook for replies

**Features:**
- Send SMS to single or bulk recipients
- Receive SMS (clients can reply)
- Short code support
- Link shortening (Bitly integration)
- Delivery tracking

**Integration:**
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);

await client.messages.create({
  body: 'Your appointment is tomorrow at 9 AM!',
  from: '+1234567890',
  to: '+1987654321'
});
```

---

### Database Schema

**`marketing_campaigns` table:**
```sql
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'drip')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sent', 'active', 'paused')),
  template_id UUID REFERENCES marketing_templates(id),
  subject TEXT, -- Email only
  content TEXT NOT NULL,
  recipients JSONB, -- Array of client IDs or segment rules
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

**`marketing_templates` table:**
```sql
CREATE TABLE marketing_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL for system templates
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  category TEXT, -- 'follow_up', 'review_request', 'promotion', etc.
  subject TEXT, -- Email only
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**`marketing_sends` table (track individual sends):**
```sql
CREATE TABLE marketing_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced BOOLEAN DEFAULT false,
  error_message TEXT
);
```

**`drip_sequences` table:**
```sql
CREATE TABLE drip_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'quote_sent', 'job_completed', etc.
  trigger_delay INTEGER, -- Days after event
  is_active BOOLEAN DEFAULT true,
  steps JSONB NOT NULL, -- Array of {type, template_id, delay_days, conditions}
  created_at TIMESTAMP DEFAULT NOW()
);
```

**`contact_lists` table:**
```sql
CREATE TABLE contact_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('manual', 'smart')),
  rules JSONB, -- For smart lists: {field, operator, value}
  client_ids UUID[], -- For manual lists
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI Components to Build

### New Components:
1. **EmailEditor.tsx** - WYSIWYG email builder (TipTap or similar)
2. **SMSComposer.tsx** - Simple SMS input with char count
3. **CampaignBuilder.tsx** - Wizard for creating campaigns
4. **TemplateSelector.tsx** - Browse and select templates
5. **RecipientSelector.tsx** - Choose who receives campaign
6. **DripFlowBuilder.tsx** - Visual flowchart for sequences
7. **AnalyticsChart.tsx** - Reusable chart component
8. **ContactListManager.tsx** - Create/edit contact lists
9. **MergeFieldPicker.tsx** - Dropdown for inserting {{fields}}
10. **CampaignPreview.tsx** - Preview email/SMS before sending

### New Pages:
1. `src/pages/Marketing.tsx` - Main dashboard
2. `src/pages/EmailCampaigns.tsx` - Email campaign list + builder
3. `src/pages/SMSCampaigns.tsx` - SMS campaign list + builder
4. `src/pages/DripSequences.tsx` - Drip sequence builder
5. `src/pages/MarketingTemplates.tsx` - Template library
6. `src/pages/ContactLists.tsx` - Manage contact lists
7. `src/pages/MarketingAnalytics.tsx` - Performance reports

---

## 💰 Pricing & Credits

### SMS Credits System:
- Buy credits upfront (no monthly fee)
- $10 = 1,000 credits (~1,000 SMS)
- $25 = 2,700 credits (~2,700 SMS)
- $50 = 5,500 credits (~5,500 SMS)
- $100 = 12,000 credits (~12,000 SMS)

**Auto-reload:**
- Set threshold (e.g., "reload when balance hits 100")
- Auto-charge card
- Email notification before reload

### Email Sending:
- Included with Pro plan (via Resend)
- First 3,000/month free
- $20/month for 50,000 emails (charged separately if exceeded)

---

## 🚀 Implementation Phases

### Phase 1: Email Campaigns (Week 1)
- [ ] Email composer with WYSIWYG editor
- [ ] Template library (10 pre-built templates)
- [ ] Send to all clients or specific list
- [ ] Track sends (sent_at, delivered_at)
- [ ] Basic analytics (sent, opened, clicked)

### Phase 2: SMS Campaigns (Week 2)
- [ ] SMS composer (simple text input)
- [ ] Twilio integration
- [ ] SMS credit system (Stripe)
- [ ] Recipient selector
- [ ] Delivery tracking

### Phase 3: Drip Sequences (Week 3)
- [ ] Visual flowchart builder
- [ ] Trigger system (quote_sent, job_completed, etc.)
- [ ] Delay logic (send after X days)
- [ ] Pre-built sequences
- [ ] Sequence analytics

### Phase 4: Advanced Features (Week 4)
- [ ] Contact lists & segments
- [ ] A/B testing
- [ ] Two-way SMS inbox
- [ ] Review request automation
- [ ] Referral program
- [ ] Advanced analytics

---

## 📊 Success Metrics

**Track:**
- Number of campaigns sent
- Average open rate (target: 25-35%)
- Average click rate (target: 5-10%)
- Revenue attributed to campaigns
- Client engagement improvement
- Review requests sent vs. reviews received
- Referrals generated

**ROI for Contractor:**
- Cost: $69/month (Pro plan) + SMS credits ($20-50/month)
- Value: 5-10 additional jobs/month from follow-ups
- Average job value: $500-2000
- Monthly ROI: $2,500-20,000 vs. $100/month cost = 25x-200x ROI

---

## 🎯 Competitive Advantage

**vs. Mailchimp ($20/month):**
- ✅ Built for contractors (not generic)
- ✅ Integrated with jobs/quotes/invoices
- ✅ Automated triggers (job completed, quote sent)
- ✅ SMS included

**vs. Constant Contact ($12/month):**
- ✅ Contractor-specific templates
- ✅ Direct CRM integration
- ✅ No duplicate contact management

**vs. Twilio ($15/month + per-message):**
- ✅ Easy UI (no coding needed)
- ✅ Integrated with client data
- ✅ Automated sequences

**All-in-One Value:**
- Replace Mailchimp + Twilio + Zapier = Save $40-60/month
- One login, one interface
- Data already in StackDek (no import needed)

---

## 🔐 Compliance & Best Practices

### Email (CAN-SPAM Act):
- ✅ Include unsubscribe link (automatic)
- ✅ Honor unsubscribe requests (1-click)
- ✅ Include physical address (company address)
- ✅ Don't use misleading subject lines
- ✅ Identify message as advertisement

### SMS (TCPA):
- ✅ Require opt-in (checkbox during signup)
- ✅ Include opt-out instructions ("Reply STOP to unsubscribe")
- ✅ Honor opt-out immediately
- ✅ Keep records of consent
- ✅ Don't send after 9 PM or before 8 AM (local time)

**StackDek will handle:**
- Auto opt-out management
- Compliance disclaimers
- Send time restrictions
- Consent tracking

---

## 🎁 Bonus Ideas

### 1. Voice Broadcasting (Future)
- Record voice message
- Send to list of clients
- "Press 1 to book, Press 2 to hear more"

### 2. Postcard Campaigns (via Lob.com)
- Physical mail integration
- "We miss you!" postcards
- Seasonal promotions
- High-end clients only

### 3. Social Media Automation (Future)
- Auto-post to Facebook/Instagram
- "Job completed!" with before/after photos
- Client testimonials
- Seasonal tips

---

**Ready to build the Marketing Suite?** 🚀

This would be the most comprehensive marketing tool for contractors in the industry. All integrated into StackDek, no external logins needed.
