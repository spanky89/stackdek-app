# ✅ Welcome Email Deployment Checklist

Quick reference for deploying the welcome email system.

---

## Prerequisites (5 minutes)

- [ ] **Resend Account**
  - Sign up: https://resend.com/signup
  - Verify email
  
- [ ] **Domain Verification**
  - Add stackdek.com to Resend
  - Add TXT DNS record
  - Wait for verification (5-10 min)
  
- [ ] **API Key**
  - Generate in Resend dashboard
  - Copy key (starts with `re_`)
  - Save securely

- [ ] **Supabase CLI**
  - Install: `npm install -g supabase`
  - Login: `supabase login`

---

## Deployment (15 minutes)

### Option A: Automated Script

```powershell
cd stackdek-app
.\deploy-welcome-email.ps1
```

Follow prompts:
1. Paste Resend API key when asked
2. Wait for deployment
3. Open Supabase dashboard when prompted
4. Run SQL migration

### Option B: Manual Steps

1. **Link Supabase project:**
   ```bash
   cd stackdek-app
   supabase link --project-ref duhmbhxlmvczrztccmus
   ```

2. **Set API secret:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_actual_key
   ```

3. **Deploy Edge Function:**
   ```bash
   supabase functions deploy send-welcome-email --no-verify-jwt
   ```

4. **Run database migration:**
   - Open: https://app.supabase.com/project/duhmbhxlmvczrztccmus/sql
   - Paste contents of: `migrations/welcome-email-trigger.sql`
   - Click: RUN

---

## Testing (3 minutes)

- [ ] **Test signup:**
  - Go to: https://app.stackdek.com/signup
  - Use real email address
  - Fill in: Name, Company, Email, Password
  - Click: Sign Up

- [ ] **Verify email:**
  - Check inbox (10-30 seconds)
  - Subject: "Welcome to StackDek! 🚀"
  - From: hello@stackdek.com
  - Personalized with your name

- [ ] **Check links:**
  - Click: "Go to Dashboard" → redirects correctly
  - Click: "Help Center" → opens help page

- [ ] **View logs** (if needed):
  ```bash
  supabase functions logs send-welcome-email --tail
  ```

---

## Verification

- [ ] Edge Function deployed (green checkmark in Supabase)
- [ ] Database trigger active (`on_auth_user_created`)
- [ ] Test email received and formatted correctly
- [ ] Dashboard link works
- [ ] No errors in function logs

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not arriving | Check Resend dashboard → Emails for status |
| Trigger not firing | Re-run SQL migration |
| API error | Verify Resend key: `supabase secrets list` |
| Domain not verified | Wait 30 min, check DNS with mxtoolbox.com |

---

## Documentation

- **Full Setup:** `EMAIL_SETUP_COMPLETE.md`
- **Quick Start:** `RESEND_SETUP_GUIDE.md`
- **Environment Vars:** `ENV_VARIABLES.md`
- **Implementation Details:** `EMAIL_IMPLEMENTATION_SUMMARY.md`

---

## Success! 🎉

Once all checkboxes are marked:
- Update `SESSION-STATE.md` ✅
- Document API key in secure location
- Move to next cron job (Drip Sequence, Feb 20)

---

**Total Time:** ~20 minutes  
**Next Steps:** Build drip email sequence (Day 1, Day 3 emails)

---

*Last updated: February 19, 2026*
