# Upgrade Prompt UI Mockups

**Version:** 1.0  
**Date:** February 19, 2026

---

## 1. Limit Indicator Components

### Client Limit Indicator (Free Tier)
```
┌─────────────────────────────────────┐
│ Clients                   8 / 10    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░        │
│                                     │
└─────────────────────────────────────┘
```

### At Limit Warning
```
┌─────────────────────────────────────┐
│ Clients                  10 / 10    │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 🔴  │
│ Limit reached. Upgrade to Pro       │
│ for unlimited clients.              │
└─────────────────────────────────────┘
```

### Pro User (Unlimited)
```
┌─────────────────────────────────────┐
│ Clients                     47      │
│ ✨ Unlimited                         │
└─────────────────────────────────────┘
```

---

## 2. Inline Upgrade Prompts

### CSV Export Button (Locked)
```
┌──────────────────────────┐
│  [💾 Export CSV]  [PRO]  │  ← Button is grayed out
│                          │
│  Hover tooltip:          │
│  "CSV Export - Upgrade   │
│   to Pro"                │
└──────────────────────────┘
```

### Email Automation Section (Locked)
```
┌─────────────────────────────────────┐
│ 📧 Email Automation        [PRO]    │
├─────────────────────────────────────┤
│                                     │
│  Automate follow-ups, reminders,   │
│  and drip campaigns.                │
│                                     │
│  [🚀 Upgrade to Pro]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 3. Modal Upgrade Prompts

### Full-Screen Upgrade Modal
```
╔═════════════════════════════════════════════╗
║                                             ║
║           ┌──────────────┐                  ║
║           │     PRO      │                  ║
║           └──────────────┘                  ║
║                                             ║
║        Advanced Analytics                   ║
║                                             ║
║   Revenue reports, client insights,         ║
║   and performance tracking.                 ║
║                                             ║
║   Upgrade to Pro to unlock this             ║
║   feature and more.                         ║
║                                             ║
║   ┌─────────────────────────────┐           ║
║   │   Upgrade to Pro - $29/mo   │           ║
║   └─────────────────────────────┘           ║
║                                             ║
║   [No thanks, stay on Free]                 ║
║                                             ║
╚═════════════════════════════════════════════╝
```

---

## 4. Dashboard Banner

### At Limit Warning (Top of Dashboard)
```
┌───────────────────────────────────────────────────┐
│ ⚠️ You've used 24/25 jobs this month.             │
│    Upgrade to Pro for unlimited jobs.             │
│                                         [Upgrade] │
└───────────────────────────────────────────────────┘
```

### Trial Expiring Soon
```
┌───────────────────────────────────────────────────┐
│ 🎉 Your Pro trial ends in 3 days.                 │
│    Add payment to keep Pro features.              │
│                                    [Add Payment] │
└───────────────────────────────────────────────────┘
```

---

## 5. Pricing Page (3-Column Layout)

```
┌──────────────────────────────────────────────────────────────┐
│                  Choose Your Plan                            │
│        Start free, upgrade when you're ready to scale        │
│                                                              │
│        [Monthly]  [Yearly - Save 20%]                        │
│                                                              │
├──────────────┬─────────────────────┬─────────────────────────┤
│              │                     │                         │
│    FREE      │    PRO ⭐           │    PREMIUM             │
│              │  (Most Popular)     │                         │
│    $0        │    $29/mo           │    $99/mo               │
│  forever     │                     │                         │
│              │                     │                         │
│ ✅ 10 clients │ ✅ Unlimited clients│ ✅ Everything in Pro   │
│ ✅ 25 jobs/mo│ ✅ Unlimited jobs   │ ✅ API access          │
│ ✅ Invoicing │ ✅ Custom branding  │ ✅ Team members        │
│ ✅ Quotes    │ ✅ Email automation │ ✅ White label         │
│ ✅ Scheduling│ ✅ CSV export       │ ✅ Custom domains      │
│              │ ✅ Analytics        │ ✅ Dedicated manager   │
│              │ ✅ Priority support │                         │
│              │                     │                         │
│ [Get Started]│ [Upgrade to Pro]    │ [Upgrade to Premium]   │
│              │                     │                         │
└──────────────┴─────────────────────┴─────────────────────────┘
```

---

## 6. Settings Page - Billing Section

```
┌─────────────────────────────────────────┐
│ Subscription & Billing                  │
├─────────────────────────────────────────┤
│                                         │
│ Current Plan:  [PRO]                    │
│ Status:        Active                   │
│ Next billing:  March 19, 2026           │
│ Amount:        $29.00/month             │
│                                         │
│ [Manage Subscription] ← Opens Stripe    │
│                         Billing Portal  │
│                                         │
│ Change payment method, cancel, or       │
│ view invoices.                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## 7. "Add Client" Button (At Limit)

### Before Limit (8/10 clients)
```
┌──────────────────────┐
│  [+ Add Client]      │
└──────────────────────┘
```

### At Limit (10/10 clients)
```
┌──────────────────────────────────────┐
│  [+ Add Client] ← Disabled           │
│                                      │
│  Modal pops up:                      │
│  ╔═══════════════════════════════╗   │
│  ║ Client Limit Reached          ║   │
│  ║                               ║   │
│  ║ You've reached your 10-client ║   │
│  ║ limit on the Free plan.       ║   │
│  ║                               ║   │
│  ║ Upgrade to Pro for unlimited  ║   │
│  ║ clients, jobs, and more.      ║   │
│  ║                               ║   │
│  ║ [Upgrade to Pro - $29/mo]     ║   │
│  ║                               ║   │
│  ║ [Maybe later]                 ║   │
│  ╚═══════════════════════════════╝   │
└──────────────────────────────────────┘
```

---

## 8. Color Palette

### Pro Badge Colors
- Gradient: `#8B5CF6` (purple-500) → `#EC4899` (pink-500)
- Text: White (`#FFFFFF`)

### Warning Colors
- At Limit: Red (`#EF4444`)
- Near Limit (80%+): Yellow (`#F59E0B`)
- Normal: Blue (`#3B82F6`)

### Background Colors
- Upgrade Prompt: Light gradient `#FAF5FF` (purple-50) → `#FCE7F3` (pink-50)
- Border: `#E9D5FF` (purple-200)

---

## 9. Animation Effects

### Limit Indicator Animation
- Progress bar fills smoothly (CSS transition: 0.3s ease)
- Color change at 80%: yellow → red

### Pro Badge Shimmer
```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

.pro-badge {
  background: linear-gradient(
    90deg,
    #8B5CF6 0%,
    #EC4899 50%,
    #8B5CF6 100%
  );
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}
```

### Modal Fade-In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.upgrade-modal {
  animation: fadeIn 0.2s ease-out;
}
```

---

## 10. Responsive Design

### Mobile (< 768px)
- Pricing cards stack vertically
- Limit indicators full width
- Upgrade prompts use bottom sheet instead of modal

### Tablet (768px - 1024px)
- Pricing cards: 2-column layout (Free + Pro on top, Premium below)
- Side-by-side limit indicators

### Desktop (> 1024px)
- 3-column pricing layout
- Inline upgrade prompts in sidebar
- Modal centered

---

## Implementation Notes

1. **Use Tailwind CSS** for all styling (already in project)
2. **Framer Motion** (optional) for smooth animations
3. **React Icons** for icons (`react-icons/fa`, `react-icons/md`)
4. **Test on multiple screen sizes** before launch

---

## Accessibility

- All buttons have `aria-label` attributes
- Pro badges have `role="status"` for screen readers
- Upgrade modals are keyboard-navigable (Tab, Esc)
- Color contrast meets WCAG AA standards (4.5:1 minimum)

---

**Ready for design review!** 🎨
