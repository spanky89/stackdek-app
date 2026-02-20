# 📧 Quick Start: Resend Email Setup

**Time to complete:** 5 minutes  
**What you'll need:** Domain access (for DNS records)

---

## Step 1: Create Resend Account

1. Go to: **https://resend.com/signup**
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your email

---

## Step 2: Add & Verify Domain

### Add stackdek.com

1. In Resend dashboard → **Domains** → **Add Domain**
2. Enter: `stackdek.com`
3. Click **Add Domain**

### Add DNS Records

Resend will give you TXT records to add. Example:

```
Type: TXT
Name: resend._domainkey.stackdek.com
Value: [provided by Resend - looks like: v=DKIM1; k=rsa; p=MIIBIjANB...]
TTL: 3600
```

**Where to add DNS records:**
- If using Cloudflare: DNS → Add Record
- If using Namecheap: Advanced DNS → Add New Record
- If using GoDaddy: DNS Management → Add Record

### Verify Domain

1. Wait 5-10 minutes for DNS propagation
2. Click **Verify Domain** in Resend dashboard
3. Status should show: ✅ **Verified**

---

## Step 3: Get API Key

1. Resend dashboard → **API Keys**
2. Click **Create API Key**
3. Name: `StackDek Production`
4. Permissions: **Sending access**
5. Click **Create**
6. **Copy the key** (starts with `re_...`)
   - ⚠️ Save it somewhere safe - you can't see it again!

---

## Step 4: Deploy to StackDek

### Option A: PowerShell Script (Easiest)

```powershell
cd stackdek-app
.\deploy-welcome-email.ps1
```

Follow the prompts. The script will:
- Check Supabase CLI
- Link project
- Set Resend API key
- Deploy Edge Function

### Option B: Manual Deployment

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login:**
   ```bash
   supabase login
   ```

3. **Link project:**
   ```bash
   cd stackdek-app
   supabase link --project-ref duhmbhxlmvczrztccmus
   ```

4. **Set Resend API key:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_key_here
   ```

5. **Deploy function:**
   ```bash
   supabase functions deploy send-welcome-email --no-verify-jwt
   ```

---

## Step 5: Enable Database Trigger

1. **Open Supabase Dashboard:**
   https://app.supabase.com/project/duhmbhxlmvczrztccmus

2. **Go to SQL Editor** → **New Query**

3. **Copy & paste** `migrations/welcome-email-trigger.sql`

4. Click **RUN** (or Ctrl+Enter)

5. **Verify trigger:**
   - Database → Triggers
   - Look for: `on_auth_user_created` ✅

---

## Step 6: Test It!

1. **Sign up with a real email:**
   https://app.stackdek.com/signup

2. **Check your inbox** (should arrive in 10-30 seconds)

3. **Verify email:**
   - Subject: "Welcome to StackDek! 🚀"
   - From: hello@stackdek.com
   - Personalized with your name

4. **Check logs** (if email doesn't arrive):
   ```bash
   supabase functions logs send-welcome-email --tail
   ```

---

## ✅ Success Checklist

- [ ] Resend account created
- [ ] Domain verified (stackdek.com)
- [ ] API key generated and saved
- [ ] Edge Function deployed to Supabase
- [ ] Database trigger created
- [ ] Test email received successfully

---

## 🛠️ Troubleshooting

### Email not arriving?

**Check Resend dashboard:**
- Go to: https://resend.com/emails
- Look for sent emails
- Check delivery status

**Check Supabase logs:**
```bash
supabase functions logs send-welcome-email --tail
```

Look for errors like:
- `Invalid API key` → Re-run `supabase secrets set`
- `Domain not verified` → Check DNS records
- `Rate limit exceeded` → Wait 1 hour (free tier limit)

### Domain verification stuck?

**Check DNS propagation:**
- Go to: https://mxtoolbox.com/TXTLookup.aspx
- Enter: `resend._domainkey.stackdek.com`
- Should show Resend's TXT record

**If still failing:**
- Wait 30-60 minutes (DNS can be slow)
- Use Resend's test domain temporarily: `onboarding@resend.dev`

### Trigger not firing?

**Verify trigger exists:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Re-run migration:**
- Open `migrations/welcome-email-trigger.sql`
- Run in SQL Editor again

---

## 📚 Next Steps

After welcome emails work:

1. **Drip email sequence** (Day 1, Day 3, Day 7 emails)
2. **Transaction emails** (invoice sent, payment received, etc.)
3. **Email analytics** (track opens, clicks)

---

## 📝 Resources

- **Resend Docs:** https://resend.com/docs
- **Supabase Functions:** https://supabase.com/docs/guides/functions
- **Full Setup Docs:** `EMAIL_SETUP_COMPLETE.md`

---

**Need help?** Open an issue or contact: hello@stackdek.com

---

*Last updated: February 19, 2026*
