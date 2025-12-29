# IMMEDIATE FIX: API Routes 404 on Vercel

## The Problem
Both `/api/test` and `/api/documents` return 404, meaning API routes aren't working at all.

## Most Likely Cause
`NEXT_PUBLIC_STATIC_EXPORT=true` is set in Vercel environment variables, which disables API routes.

## IMMEDIATE ACTION REQUIRED

### Step 1: Check Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your project: **pmd-webapp**
3. Click **Settings** → **Environment Variables**
4. **Search for**: `NEXT_PUBLIC_STATIC_EXPORT`
5. **If it exists and is `true`**: 
   - Click the variable
   - Click **Delete** or change value to `false`
   - Save

### Step 2: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 3: Test

After redeploy:
- `https://pmd-webapp.vercel.app/api/test` - Should return JSON
- `https://pmd-webapp.vercel.app/api/documents` - Should return JSON or array

## If Variable Doesn't Exist

If `NEXT_PUBLIC_STATIC_EXPORT` doesn't exist in Vercel:

1. Check **Vercel Dashboard** → Settings → **General**
2. Verify **Framework Preset** is **"Next.js"**
3. Check **Build Command** - should be `npm run build`
4. Try **Disconnect** and **Reconnect** Git repository
5. This will re-detect Next.js and enable API routes

## Verify Build Output

After redeploy, check:

1. **Vercel Dashboard** → Deployments → Latest → **Build Logs**
2. Look for: `Route (app)` section
3. Should see: `app/api/test/route` and `app/api/documents/route`

If routes are NOT in build logs → They're not being built (configuration issue)

## Check Functions Tab

1. **Vercel Dashboard** → Deployments → Latest → **Functions** tab
2. Should see `/api/test` and `/api/documents` listed

If missing → Routes aren't being deployed

## Quick Test

The fastest way to verify:
1. Delete `NEXT_PUBLIC_STATIC_EXPORT` if it exists
2. Redeploy
3. Test `/api/test` - if this works, API routes are enabled


