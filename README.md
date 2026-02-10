# StackDek — Local Development Setup

## Quick Start

### 1. Install Dependencies
```bash
cd C:\Users\x\.openclaw\workspace\stackdek-app
npm install
```

### 2. Set Up Database Schema

Go to your Supabase dashboard:
1. Click on "SQL Editor" (left sidebar)
2. Click "New Query"
3. Copy and paste the entire contents of `SCHEMA.sql`
4. Click "Run"
5. Wait for confirmation (should see green checkmarks)

### 3. Start Dev Server
```bash
npm run dev
```

This will open the app at `http://localhost:5173`

### 4. Test Login

Create a test account:
1. Go to Supabase dashboard → "Authentication" → "Users"
2. Click "Add user" (or use invite if you prefer)
3. Email: test@example.com
4. Password: password123
5. Back in app, sign in with those credentials

### 5. You're In!

You should see:
- Dashboard with revenue stats (empty for now)
- "View Job Stack" button
- "Create New Job" button

---

## What's Built

✅ **Auth**: Email/password login (Supabase handles it)  
✅ **Home Dashboard**: Shows revenue and job count  
✅ **Job Stack**: List jobs with filtering  
✅ **Database**: All tables created (companies, jobs, quotes, invoices, etc.)  
✅ **RLS**: Row-level security so users only see their data

---

## What's Next

**Days 2-4**: Add Create forms (job, quote, client)  
**Days 4-6**: Client management pages  
**Days 6-8**: Invoice management + status tracking  
**Days 8-10**: Polish + testing  
**Days 10-14**: Deploy to Vercel

---

## Debugging

**"Missing Supabase environment variables"**
- Make sure `.env.local` is in the root folder with your credentials

**"Cannot find module @supabase/supabase-js"**
- Run `npm install` again

**Login doesn't work**
- Make sure user exists in Supabase Authentication
- Check email/password are correct

**Database tables don't exist**
- Make sure you ran the SCHEMA.sql in Supabase SQL Editor

---

**Need help?** Check SETUP.md for more details.
