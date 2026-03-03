# Authentication Change Checklist

**Use this checklist BEFORE making ANY changes to authentication flows.**

---

## Before Starting

- [ ] **Is this change absolutely necessary?** (Auth works = don't touch it)
- [ ] **Can this be optional instead of forced?** (Feature flags > mandatory changes)
- [ ] **Do we have a staging environment to test?** (Never test auth in production)

---

## Development

- [ ] Create feature branch (never work directly on main for auth)
- [ ] Test locally with multiple accounts
- [ ] Test OAuth flow completely (signup + login + logout)
- [ ] Test email/password flow completely
- [ ] Test "forgot password" if modified
- [ ] Check browser console for errors
- [ ] Test in incognito mode (fresh session)

---

## Before Deploying

- [ ] Code review by someone else
- [ ] Deploy to staging/preview environment first
- [ ] Test on staging with real OAuth provider
- [ ] Test on multiple devices (desktop + mobile)
- [ ] Test on multiple browsers (Chrome + Safari + Edge)
- [ ] Document rollback procedure before pushing

---

## Deployment

- [ ] Deploy during low-traffic time
- [ ] Monitor Vercel deployment logs
- [ ] Verify deployment actually completed (check Vercel dashboard)
- [ ] Test immediately after deploy on fresh device
- [ ] Have rollback ready (know which commit to revert to)

---

## After Deployment

- [ ] Test OAuth signup (new account)
- [ ] Test OAuth login (existing account)
- [ ] Test email/password login
- [ ] Test on mobile device
- [ ] Monitor for user reports/errors
- [ ] Check Supabase auth logs for issues

---

## If Something Breaks

### DO:
1. ✅ **Revert immediately** - Don't try multiple fixes
2. ✅ **Test revert on fresh device** - Verify it actually fixed it
3. ✅ **Check Vercel deployment** - Make sure new code actually deployed
4. ✅ **Clear Vercel cache if needed** - Delete files if revert doesn't work
5. ✅ **Document what happened** - Learn from the mistake

### DON'T:
1. ❌ **Try multiple fixes in production** - Revert first, debug offline
2. ❌ **Assume code deployed** - Check Vercel dashboard
3. ❌ **Test only on your device** - Your cache lies to you
4. ❌ **Panic and make it worse** - Slow down, revert, think

---

## Red Flags (STOP and Reconsider)

- 🚩 Modifying OAuth callback flow
- 🚩 Adding redirects between auth steps
- 🚩 Forcing new steps during signup/login
- 🚩 Changing session management
- 🚩 Modifying protected route logic
- 🚩 Making auth changes without staging environment

---

## Emergency Contacts

**If auth breaks:**
1. Check #incidents channel
2. Post in team chat immediately
3. Start incident timeline
4. Begin rollback procedure

**Rollback Procedure:**
```bash
# 1. Find last working commit
git log --oneline -20

# 2. Revert to that commit
git checkout <commit-hash> -- src/App.tsx src/pages/Login.tsx

# 3. Commit and push
git commit -m "EMERGENCY: Revert auth changes"
git push origin main

# 4. Verify deployment in Vercel dashboard

# 5. Test on fresh device immediately
```

---

## Remember

**Authentication is the front door to your app.**

If the front door is broken, nobody can get in. No matter how good the inside is.

**When in doubt, don't change it.**

---

*Created: March 3, 2026, after OAuth outage incident*
