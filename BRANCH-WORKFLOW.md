# Branch Testing Workflow

## Branches We Have:

- **`main`** - Production (stackdek-app.vercel.app) - Stable, customer-facing
- **`staging`** - Pre-production testing - Test everything before going live
- **`pro-features`** - New premium features - Safe sandbox for building

---

## How Vercel Auto-Deployment Works:

Every time you push to **ANY** branch, Vercel automatically creates a preview URL:

- `main` → https://stackdek-app.vercel.app (production)
- `staging` → https://stackdek-app-git-staging-spanky89.vercel.app
- `pro-features` → https://stackdek-app-git-pro-features-spanky89.vercel.app

**No manual deployment needed!** Just push and wait ~2 minutes.

---

## Quick Commands:

### See what branch you're on:
```bash
git branch
```

### Switch to a different branch:
```bash
# Switch to staging
git checkout staging

# Switch to pro-features
git checkout pro-features

# Switch back to main
git checkout main
```

### Make changes and push to current branch:
```bash
# After making changes...
git add .
git commit -m "Your message here"
git push
```

Vercel will auto-deploy to that branch's preview URL!

---

## Testing Workflow:

### Option 1: Build Pro Features Safely
```bash
# 1. Switch to pro-features branch
git checkout pro-features

# 2. Make your changes (add new features, test stuff)

# 3. Commit and push
git add .
git commit -m "Add advanced reporting feature"
git push

# 4. Test on preview URL (check Vercel dashboard for exact URL)

# 5. When ready, merge to staging
git checkout staging
git merge pro-features
git push

# 6. Test on staging URL

# 7. When staging looks good, merge to main
git checkout main
git merge staging
git push
```

### Option 2: Quick Test Before Production
```bash
# 1. Switch to staging
git checkout staging

# 2. Make small tweaks/fixes

# 3. Push and test
git push

# 4. If good, merge to main
git checkout main
git merge staging
git push
```

---

## Finding Your Preview URLs:

**Option 1: Vercel Dashboard**
1. Go to https://vercel.com/spanky89/stackdek-app/deployments
2. Look for your branch name
3. Click the deployment
4. Copy the URL

**Option 2: GitHub**
1. Go to your GitHub repo
2. Click on the branch dropdown
3. Select your branch
4. Look for "View deployment" button (Vercel adds this automatically)

---

## Pro Tips:

### Create a new feature branch anytime:
```bash
git checkout -b new-feature-name
git push -u origin new-feature-name
```
Vercel will auto-create a preview URL!

### Delete a branch when done:
```bash
# Delete locally
git branch -d branch-name

# Delete on GitHub
git push origin --delete branch-name
```

### Undo changes on a branch (reset to match main):
```bash
git checkout your-branch
git reset --hard origin/main
git push --force
```

---

## Emergency: Broke Production?

**Quick rollback:**
```bash
# 1. Find last working commit
git log --oneline -10

# 2. Reset main to that commit
git checkout main
git reset --hard <commit-hash>
git push --force

# Vercel will auto-deploy the old version
```

---

## Current Branch Status:

- **main**: Production-ready, customer-facing
- **staging**: Created 2026-03-03 - Ready for pre-production testing
- **pro-features**: Created 2026-03-03 - Safe space for building new features

---

**Rule of Thumb:**
- Build risky stuff on `pro-features`
- Test everything on `staging`
- Only merge to `main` when 100% confident
- After today's OAuth disaster: **NEVER TOUCH AUTH ON MAIN AGAIN** 😅
