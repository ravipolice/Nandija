# Vercel Main Branch Setup - Final Steps

## ✅ What's Done

1. ✅ Local branch renamed to `main`
2. ✅ Route files are in Git: `app/api/documents/route.ts`
3. ✅ All API routes are committed

## ⚠️ Current Situation

- Local `main` branch has all your code (including API routes)
- Remote `main` branch exists but may have different content
- Vercel needs to deploy from `main` branch

## 🔧 Final Steps to Fix

### Option 1: Force Push to Main (If Safe)

If you're sure your local code is correct:

```bash
git push origin main --force
```

⚠️ **Warning**: This overwrites remote main. Only do this if you're sure.

### Option 2: Verify Vercel Branch (Recommended First)

**Before force pushing**, check Vercel:

1. Go to **Vercel Dashboard** → Settings → **Git**
2. Check **Production Branch**:
   - If it's `main` → Good! Vercel will deploy from main
   - If it's `master` → Change to `main` and save
3. **Redeploy** after changing branch

### Option 3: Check What's on Remote Main

You can check what's on remote main:
- Go to GitHub: https://github.com/ravipolice/pmd-webapp
- Switch to `main` branch
- Check if `app/api/documents/route.ts` exists

## Most Important: Vercel Settings

Regardless of Git branch issues:

1. **Vercel Dashboard** → Settings → **Git**
   - Production Branch: Should be `main`

2. **Vercel Dashboard** → Settings → **Environment Variables**
   - `NEXT_PUBLIC_STATIC_EXPORT` should NOT be `true`

3. **Redeploy** after any changes

## After Vercel Redeploys

Test:
- `https://pmd-webapp.vercel.app/api/test`
- `https://pmd-webapp.vercel.app/api/documents`

If still 404:
1. Check Vercel Build Logs - look for route compilation
2. Check Vercel Functions tab - see if routes are listed
3. Verify environment variables

## Quick Checklist

- [ ] Vercel Production Branch set to `main`
- [ ] `NEXT_PUBLIC_STATIC_EXPORT` is NOT `true` in Vercel
- [ ] Latest deployment is from `main` branch
- [ ] Build logs show API routes being compiled
- [ ] Functions tab shows `/api/documents` and `/api/test`


