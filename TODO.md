# StackDek TODO List

## 🔔 Notifications & Monitoring

### Telegram Signup Notifications (Later)
**Priority:** Medium  
**Status:** Saved for post-launch

**What it does:** Instant Telegram message when someone signs up with business name, email, and timestamp.

**Setup steps:**
1. Create Edge Function `signup-notification` in Supabase
2. Get bot token from @BotFather on Telegram (send `/newbot`)
3. Add env vars to Supabase Edge Functions:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID=8415065631`
4. Deploy function
5. Run SQL webhook trigger (saved in notes below)

**Reference:** See conversation from Feb 21, 2026 for full code + SQL.

---

## ✅ Completed

- [x] **Supabase Storage Buckets** (Feb 21, 2026)
  - Created `quotes` bucket (public, for client PDF viewing)
  - Created `invoices` bucket (private, signed URLs only)
  - Created `company-logos` bucket (public, for branding)
  - Applied RLS policies (users can only access their own company files)
  - File structure: `{bucket}/{company_id}/{filename}`

---

## 📋 Active Tasks

_(Add current work here)_
