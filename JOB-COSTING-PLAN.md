# Job Costing Plan - Pro Feature

**Goal:** Give contractors real-time visibility into job profitability  
**Location:** Integrated into JobDetail page  
**User Access:** Owner/Manager see everything, Employees can add expenses only

---

## 🎯 Core Features

### 1. Revenue Tracking
**Sources:**
- Quote total (original estimate)
- Invoice total (actual billed amount)
- Payments received (what's actually collected)
- Change orders (additional work added)

**Display:**
```
Revenue
├─ Original Quote: $5,000
├─ Change Orders: +$800
├─ Total Billed: $5,800
└─ Collected: $5,800 ✓ (100%)
```

---

### 2. Expense Tracking
**Categories:**
- Materials (lumber, concrete, fasteners, etc.)
- Equipment rental (excavator, tools, etc.)
- Subcontractors (electrician, plumber, etc.)
- Permits & fees
- Fuel & transportation
- Other expenses

**Each Expense Entry:**
- Date/time
- Category
- Description
- Amount
- Receipt photo (optional)
- Added by (which employee)
- Billable? (yes/no - for change orders)

**Example:**
```
Expenses ($2,340)
├─ Materials
│  ├─ Pressure-treated lumber - $450 (John, Mar 1)
│  ├─ Deck screws & hardware - $85 (John, Mar 1)
│  └─ Post caps & railing - $220 (Mike, Mar 2)
├─ Equipment
│  └─ Auger rental (2 days) - $180 (John, Mar 1)
├─ Subcontractors
│  └─ Electrician for outdoor outlets - $650 (You, Mar 3)
└─ Fuel
   └─ Gas for trip to job site - $55 (Mike, Mar 2)
```

---

### 3. Labor Tracking
**Automatic from Time Clock:**
- Pull clock-in/out entries for this job
- Calculate total hours per employee
- Apply hourly rate (set per employee)
- Show cost breakdown

**Labor Cost Calculation:**
```
Labor ($1,680)
├─ John Smith (Lead)
│  ├─ 24 hours × $35/hr = $840
│  └─ Mar 1-3 (8h, 8h, 8h)
├─ Mike Davis (Helper)
│  ├─ 16 hours × $25/hr = $400
│  └─ Mar 2-3 (8h, 8h)
└─ Sarah Johnson (Painter)
   ├─ 12 hours × $30/hr = $360
   └─ Mar 4-5 (6h, 6h)
```

**Labor Efficiency:**
- Estimated hours (from quote): 30 hours
- Actual hours: 52 hours
- Variance: +22 hours (73% over)
- Learning: Next deck quote should be 50-55 hours

---

### 4. Profit Breakdown
**Real-time Calculation:**
```
Job Profitability: Install Deck - Bob Johnson

Revenue                        $5,800
  Original Quote               $5,000
  Change Order #1 (Railing)    +$800

Total Costs                   -$4,020
  Materials                   -$1,340
  Equipment Rental              -$180
  Subcontractors                -$650
  Labor (52 hours)            -$1,680
  Fuel & Misc                   -$170

Gross Profit                   $1,780
Profit Margin                   30.7%

vs. Estimated Profit           $2,200 (44% margin)
Variance                        -$420 (labor overrun)
```

---

## 🎨 UI Design - JobDetail Integration

### New Section: "Job Costing" Tab
**Location:** JobDetail page, new tab next to "Details", "Line Items", "Activity"

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Job Details  │  Line Items  │  Job Costing  │  Activity │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📊 Profitability Overview                               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Revenue     │  │  Costs       │  │  Profit      │  │
│  │  $5,800      │  │  $4,020      │  │  $1,780      │  │
│  │  ✓ Collected │  │  (69% of     │  │  30.7%       │  │
│  │              │  │   revenue)   │  │  margin      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Progress Bar: [████████████░░░░] 30.7% profit       ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  💰 Revenue Breakdown                                    │
├─────────────────────────────────────────────────────────┤
│  Original Quote              $5,000                      │
│  Change Order #1 (Railing)   +$800                      │
│  ─────────────────────────────────────                  │
│  Total Billed                $5,800                      │
│  Collected                   $5,800 ✓                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  💸 Expenses                         [+ Add Expense]     │
├─────────────────────────────────────────────────────────┤
│  Materials ($1,340)                                      │
│    • Pressure-treated lumber      $450   John   Mar 1   │
│    • Deck screws & hardware       $85    John   Mar 1   │
│    • Post caps & railing          $220   Mike   Mar 2   │
│    • Stain & sealer (5 gal)       $285   Sarah  Mar 4   │
│    • Concrete for footings        $300   John   Mar 1   │
│                                                           │
│  Equipment Rental ($180)                                 │
│    • Post hole auger (2 days)     $180   John   Mar 1   │
│                                                           │
│  Subcontractors ($650)                                   │
│    • Electrician (outdoor plugs)  $650   You    Mar 3   │
│                                                           │
│  Fuel & Misc ($170)                                      │
│    • Gas to job site              $55    Mike   Mar 2   │
│    • Lunch for crew               $115   You    Mar 3   │
│  ─────────────────────────────────────                  │
│  Total Expenses                  $2,340                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  👷 Labor Costs                                          │
├─────────────────────────────────────────────────────────┤
│  John Smith (Lead) - $35/hr                              │
│    24 hours (Mar 1-3)            $840                    │
│    └─ Mar 1: 8h, Mar 2: 8h, Mar 3: 8h                    │
│                                                           │
│  Mike Davis (Helper) - $25/hr                            │
│    16 hours (Mar 2-3)            $400                    │
│    └─ Mar 2: 8h, Mar 3: 8h                               │
│                                                           │
│  Sarah Johnson (Painter) - $30/hr                        │
│    12 hours (Mar 4-5)            $360                    │
│    └─ Mar 4: 6h, Mar 5: 6h                               │
│  ─────────────────────────────────────                  │
│  Total Labor (52 hours)          $1,680                  │
│  Estimated Labor (30 hours)      -$1,050                 │
│  Variance: +22 hours (73% over)  ⚠️                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📈 Performance vs. Estimate                             │
├─────────────────────────────────────────────────────────┤
│                      Estimated    Actual    Variance     │
│  Revenue             $5,000      $5,800     +$800 ✓     │
│  Materials           $1,200      $1,340     -$140 ⚠️     │
│  Labor (hours)       30h         52h        +22h ⚠️      │
│  Labor (cost)        $1,050      $1,680     -$630 ⚠️     │
│  Other Costs         $550        $1,000     -$450 ⚠️     │
│  ─────────────────────────────────────────────────      │
│  Gross Profit        $2,200      $1,780     -$420 ⚠️     │
│  Profit Margin       44.0%       30.7%      -13.3% ⚠️    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Employee Experience

### Adding an Expense (Employee View)
**Mobile-Optimized Form:**
```
┌─────────────────────────────────┐
│  Add Expense to Job              │
├─────────────────────────────────┤
│  Job: Install Deck - Bob Johnson │
│                                   │
│  Category *                       │
│  [Materials ▼]                    │
│                                   │
│  Description *                    │
│  [Pressure-treated lumber     ]  │
│                                   │
│  Amount *                         │
│  [$450.00                     ]  │
│                                   │
│  Receipt Photo (Optional)         │
│  [📷 Take Photo] [📁 Upload]     │
│                                   │
│  Notes                            │
│  [2x6x12 boards from Home Depot] │
│                                   │
│  □ Billable to client             │
│    (for change orders)            │
│                                   │
│  [Cancel]          [Add Expense]  │
└─────────────────────────────────┘
```

**After Submission:**
- Expense appears in job costing immediately
- Manager gets notification
- Receipt stored in job folder
- Updates profit calculation in real-time

---

## 💾 Database Schema

### `job_expenses` table
```sql
CREATE TABLE job_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Expense details
  category TEXT NOT NULL CHECK (category IN (
    'materials',
    'equipment',
    'subcontractors',
    'permits',
    'fuel',
    'other'
  )),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  -- Metadata
  is_billable BOOLEAN DEFAULT false, -- For change orders
  receipt_url TEXT, -- Link to receipt photo in storage
  notes TEXT,
  
  -- Tracking
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_expenses_job ON job_expenses(job_id);
CREATE INDEX idx_job_expenses_company ON job_expenses(company_id);
CREATE INDEX idx_job_expenses_category ON job_expenses(category);
```

### `job_labor_entries` table
```sql
CREATE TABLE job_labor_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Employee & time
  employee_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  
  -- Rate (snapshot at time of work)
  hourly_rate DECIMAL(10,2) NOT NULL,
  
  -- Calculated
  hours_worked DECIMAL(10,2), -- Auto-calculated from clock in/out
  labor_cost DECIMAL(10,2), -- hours × rate
  
  -- Metadata
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_labor_job ON job_labor_entries(job_id);
CREATE INDEX idx_job_labor_employee ON job_labor_entries(employee_id);
```

### Update `jobs` table
```sql
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_material_cost DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_labor_cost DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_other_cost DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_profit DECIMAL(10,2);
```

### Update `team_members` table
```sql
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS overtime_rate DECIMAL(10,2);
```

---

## 🎯 Key Features

### 1. Real-Time Profit Updates
- As expenses are added → profit recalculates
- As employees clock in/out → labor cost updates
- Color-coded indicators:
  - 🟢 Green: Above estimated profit
  - 🟡 Yellow: 10-20% below estimate
  - 🔴 Red: 20%+ below estimate

### 2. Mobile-Friendly Expense Entry
- Employees can add expenses from the field
- Take photo of receipt on mobile
- Quick category selection
- One-tap submit

### 3. Variance Analysis
- Compare actual vs. estimated
- Highlight where estimates were off
- Learn for future quotes
- Export variance report

### 4. Receipt Management
- Upload receipt photos
- Stored in Supabase Storage
- Linked to expense entry
- View full receipt in modal

### 5. Change Order Tracking
- Mark expenses as "billable"
- Create change order from billable expenses
- Send updated quote to client
- Track additional revenue

### 6. Labor Efficiency Metrics
- Hours estimated vs. actual
- Which jobs run over
- Which employees are fastest
- Improve future estimates

---

## 📊 Reports & Analytics

### Job Profitability Report
**For single job:**
```
Job Profitability Report
Install Deck - Bob Johnson
Completed: March 5, 2026

Revenue Summary
  Original Quote                $5,000
  Change Orders                 +$800
  Total Billed                  $5,800
  Collected                     $5,800 (100%)

Cost Summary
  Materials                     $1,340 (23%)
  Equipment                     $180 (3%)
  Subcontractors                $650 (11%)
  Labor (52 hours)              $1,680 (29%)
  Other                         $170 (3%)
  Total Costs                   $4,020 (69%)

Profitability
  Gross Profit                  $1,780
  Profit Margin                 30.7%

vs. Estimate
  Estimated Profit              $2,200
  Variance                      -$420 (-19%)
  Primary Issue                 Labor overrun (+22 hours)
```

### Company-Wide Analytics (Future)
- Average profit margin by job type
- Most profitable service
- Cost trends over time
- Employee efficiency comparison
- Material cost optimization

---

## 🎨 UI Components to Build

### New Components:
1. **JobCostingOverview.tsx** - Top summary cards (revenue, costs, profit)
2. **ExpenseList.tsx** - Categorized expense breakdown
3. **AddExpenseModal.tsx** - Form for adding expenses
4. **LaborBreakdown.tsx** - Employee time & cost breakdown
5. **VarianceTable.tsx** - Estimated vs. actual comparison
6. **ProfitChart.tsx** - Visual profit breakdown (pie/bar chart)
7. **ReceiptViewer.tsx** - View uploaded receipt photos
8. **ChangeOrderButton.tsx** - Create change order from billable expenses

### Updated Components:
- **JobDetail.tsx** - Add "Job Costing" tab
- **CreateQuote.tsx** - Add estimated costs fields
- **EmployeeDashboard.tsx** - Quick "Add Expense" for current job

---

## 🔐 Permissions & Access

### Owner/Manager:
- ✅ View all job costs
- ✅ Add/edit/delete expenses
- ✅ View labor costs & hourly rates
- ✅ See profit calculations
- ✅ Export reports

### Employee:
- ✅ Add expenses to assigned jobs only
- ✅ View own labor hours on job
- ❌ Cannot see other employee rates
- ❌ Cannot see profit calculations
- ❌ Cannot see total revenue
- ❌ Cannot edit/delete expenses

**RLS Policies:**
```sql
-- Employees can only add expenses to assigned jobs
CREATE POLICY employee_add_expense ON job_expenses
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT employee_id FROM job_assignments 
      WHERE job_id = job_expenses.job_id
    )
  );

-- Only owner/manager can view profit data
CREATE POLICY manager_view_costs ON job_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND company_id = job_expenses.company_id
      AND role IN ('owner', 'manager')
    )
  );
```

---

## 🚀 Implementation Phases

### Phase 1: Basic Expense Tracking (Week 1)
- [ ] Create `job_expenses` table
- [ ] Build AddExpenseModal component
- [ ] Build ExpenseList component
- [ ] Add "Job Costing" tab to JobDetail
- [ ] Basic profit calculation (revenue - expenses)
- [ ] Mobile expense form

### Phase 2: Labor Integration (Week 2)
- [ ] Create `job_labor_entries` table
- [ ] Link clock in/out to specific jobs
- [ ] Calculate labor costs automatically
- [ ] Show labor breakdown in JobDetail
- [ ] Add hourly rates to team_members

### Phase 3: Estimates & Variance (Week 3)
- [ ] Add estimated cost fields to quotes
- [ ] Build VarianceTable component
- [ ] Estimated vs. actual comparison
- [ ] Color-coded variance indicators
- [ ] Learning insights ("You underestimated labor by 20%")

### Phase 4: Advanced Features (Week 4)
- [ ] Receipt photo upload
- [ ] Change order creation from billable expenses
- [ ] Job profitability report (PDF export)
- [ ] Company-wide analytics
- [ ] Material cost trends
- [ ] Employee efficiency metrics

---

## 💡 Smart Features

### Auto-Assign Labor to Jobs
**When employee clocks in:**
```
┌─────────────────────────────────┐
│  Clock In                        │
├─────────────────────────────────┤
│  Which job are you working on?   │
│                                   │
│  ○ Install Deck - Bob Johnson    │
│  ○ Fence Repair - Sarah Lee      │
│  ○ Office/Shop Time               │
│                                   │
│  [Clock In]                       │
└─────────────────────────────────┘
```
- Time automatically attributed to job
- Labor cost calculates in real-time
- No manual time entry needed

### Smart Expense Categories
**Auto-suggest based on description:**
- "lumber" → Materials
- "gas" → Fuel
- "rental" → Equipment
- "electrician" → Subcontractors

### Billable Expense Alert
**When adding expensive items:**
```
⚠️ This expense ($650) is high. 
Should this be billable to the client?

[Yes, Create Change Order] [No, It's Covered]
```

### Low Profit Warning
**When profit drops below 20%:**
```
⚠️ Job Profitability Alert
This job is only 15% profit margin.

Costs are higher than estimated:
• Labor: +$420 over
• Materials: +$140 over

Consider:
□ Creating a change order
□ Reducing remaining hours
□ Reviewing future deck quotes

[View Details] [Dismiss]
```

---

## 📈 Value Proposition

**For Contractors:**
- 💰 Know exactly what each job makes
- 📊 Stop guessing, start knowing
- ⚠️ Catch overruns before they kill profit
- 📈 Improve estimates over time
- 💼 Professional reporting for clients/accountant

**ROI:**
- Save 5-10% profit per job (better cost tracking)
- Average job: $5,000 → Save $250-500
- 20 jobs/month → $5,000-10,000/month saved
- Pro plan: $69/month → 70x-140x ROI

**vs. Competitors:**
- Most CRMs don't have job costing
- Standalone job costing software: $50-100/month
- StackDek: Included in Pro, fully integrated

---

**Ready to build Job Costing?** 🚀

This would give contractors **real-time profit visibility** on every single job. No more surprises at the end of the month.
