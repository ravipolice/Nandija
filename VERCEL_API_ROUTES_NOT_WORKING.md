# API Routes Not Working on Vercel - Complete Fix Guide

## Problem
Both `/api/test` and `/api/documents` return 404 on Vercel, meaning API routes aren't being deployed at all.

## Root Cause
This typically happens when:
1. **Static Export is Enabled** - API routes don't work with static export
2. **Vercel Project Misconfiguration** - Wrong framework preset
3. **Build Output Issue** - Routes not included in build
4. **Next.js 15 Compatibility** - Possible issue with Next.js 15 on Vercel

## Solution Steps

### Step 1: Verify Vercel Project Settings

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Check **Framework Preset**: Should be **"Next.js"**
3. Check **Build Command**: Should be `npm run build` or auto-detected
4. Check **Output Directory**: Should be `.next` or auto-detected
5. Check **Install Command**: Should be `npm install` or auto-detected

### Step 2: Check Environment Variables in Vercel

**CRITICAL**: Make sure `NEXT_PUBLIC_STATIC_EXPORT` is:
- **NOT SET** (preferred), OR
- Set to `false` (if it exists)

If it's set to `true`, API routes will be disabled!

1. Go to **Vercel Dashboard** → Settings → **Environment Variables**
2. Search for `NEXT_PUBLIC_STATIC_EXPORT`
3. If it exists and is set to `true`, **DELETE IT** or change to `false`
4. Redeploy

### Step 3: Verify Next.js Configuration

The `next.config.js` should NOT have `output: 'export'` unless explicitly needed.

Current config looks correct - it only enables static export if env var is set.

### Step 4: Check Vercel Build Logs

1. Go to **Vercel Dashboard** → Deployments → Latest
2. Click **Build Logs**
3. Look for:
   - "Route (app)" section
   - Should see: `app/api/test/route`
   - Should see: `app/api/documents/route`
4. If routes are NOT listed → They're not being built

### Step 5: Check Vercel Functions Tab

1. After deployment completes
2. Go to **Deployments** → Latest → **Functions** tab
3. Should see:
   - `/api/test`
   - `/api/documents`
4. If missing → Routes aren't being deployed

### Step 6: Force Clear Build Cache

1. Go to **Vercel Dashboard** → Settings → **General**
2. Scroll to **Build & Development Settings**
3. Click **Clear Build Cache** (if available)
4. Or manually trigger redeploy

### Step 7: Verify Git Repository

Make sure Vercel is connected to the correct repository and branch:

1. **Vercel Dashboard** → Settings → **Git**
2. Verify:
   - Repository: `ravipolice/pmd-webapp`
   - Production Branch: `master` (or `main`)
   - Latest commit is deployed

## Most Likely Fix

**The issue is probably `NEXT_PUBLIC_STATIC_EXPORT` being set to `true` in Vercel.**

### Fix:
1. Go to **Vercel Dashboard** → Settings → **Environment Variables**
2. Find `NEXT_PUBLIC_STATIC_EXPORT`
3. **Delete it** (or set to `false`)
4. **Redeploy**

## Alternative: Check Vercel Project Type

If the above doesn't work:

1. Go to **Vercel Dashboard** → Settings → **General**
2. Check if project type is correct
3. Try **Disconnect** and **Reconnect** the Git repository
4. This will re-detect the framework

## Debugging: Test Locally First

Before deploying, test locally:

```bash
npm run build
npm start
```

Then test:
- `http://localhost:3000/api/test` - Should work
- `http://localhost:3000/api/documents` - Should work

If these work locally but not on Vercel, it's a Vercel configuration issue.

## Next.js 15 Specific Notes

Next.js 15 should support API routes on Vercel. But verify:
- Next.js version: `15.2.4` (current)
- Vercel supports Next.js 15
- No known issues with API routes

## If Still Not Working

1. **Check Vercel Status**: https://vercel-status.com
2. **Contact Vercel Support**: They can check deployment logs
3. **Try Creating New Project**: Sometimes reconnecting helps
4. **Check Next.js 15 Docs**: Verify API route requirements

## Quick Checklist

- [ ] `NEXT_PUBLIC_STATIC_EXPORT` is NOT set to `true` in Vercel
- [ ] Framework preset is "Next.js"
- [ ] Build command is correct
- [ ] Routes appear in build logs
- [ ] Routes appear in Functions tab
- [ ] Latest commit is deployed
- [ ] Build cache cleared (if needed)





