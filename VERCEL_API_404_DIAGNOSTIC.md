# Vercel API Route 404 Diagnostic Guide

## Current Status
Both `/api/test` and `/api/documents` are returning 404 on Vercel.

## File Structure Verification ✅
- ✅ `app/api/documents/route.ts` exists
- ✅ `app/api/test/route.ts` exists
- ✅ Both have `export const dynamic = "force-dynamic"`
- ✅ Both have `export const runtime = 'nodejs'`

## Critical Checks in Vercel Dashboard

### 1. Check Environment Variables
Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

**CRITICAL:** Check if `NEXT_PUBLIC_STATIC_EXPORT` is set to `true`
- ❌ If it's `true`, **DELETE IT** or set it to `false`
- Static export disables ALL API routes

### 2. Check Build Logs
Go to: **Vercel Dashboard → Your Project → Deployments → Latest Deployment → Build Logs**

Look for:
- ✅ "Detected Next.js version: 15.2.4" (should NOT be 14.2.35)
- ✅ "Route (app)" section showing API routes:
  - `app/api/documents/route`
  - `app/api/test/route`
- ❌ Any build errors or warnings

### 3. Check Function Logs
Go to: **Vercel Dashboard → Your Project → Functions Tab**

After deployment, check if:
- Functions are listed for `/api/documents` and `/api/test`
- If functions are missing, the routes won't work

### 4. Verify Deployment Branch
Go to: **Vercel Dashboard → Your Project → Settings → Git**

Ensure:
- Production Branch: `main` (not `master`)
- Latest commit: Should match your latest push

## Quick Fixes to Try

### Fix 1: Force Redeploy
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "..." on latest deployment → "Redeploy"
3. Wait for build to complete
4. Test `/api/test` again

### Fix 2: Clear Build Cache
1. Go to Vercel Dashboard → Your Project → Settings → General
2. Scroll to "Build & Development Settings"
3. Click "Clear Build Cache"
4. Redeploy

### Fix 3: Verify Environment Variables
Make sure these are set in Vercel (if needed):
- `NEXT_PUBLIC_STATIC_EXPORT` = `false` (or not set)
- All Firebase env vars
- `APPS_SCRIPT_SECRET_TOKEN` (if using)

### Fix 4: Check Vercel Build Command
Go to: **Settings → General → Build & Development Settings**

Build Command should be: `npm run build`
Output Directory should be: `.next` (or leave empty for Next.js)

## Testing Locally

Run these commands to verify routes work locally:

```bash
npm run build
npm start
```

Then test:
- `http://localhost:3000/api/test` - Should return JSON
- `http://localhost:3000/api/documents` - Should return documents or empty array

If these work locally but not on Vercel, it's a deployment configuration issue.

## Next.js 15 Specific Issues

### Issue: Routes not detected
**Solution:** Ensure `export const dynamic = "force-dynamic"` is in every route file.

### Issue: Build succeeds but routes 404
**Possible causes:**
1. Static export is enabled (check env var)
2. Routes are being optimized away (check build logs)
3. Vercel function timeout (check function logs)

## If Still Not Working

1. **Check Vercel Build Logs** - Look for any errors about API routes
2. **Check Vercel Function Logs** - See if requests are reaching the functions
3. **Try a minimal test route** - Create `app/api/hello/route.ts` with just:
   ```typescript
   export async function GET() {
     return Response.json({ message: 'Hello' });
   }
   ```
4. **Contact Vercel Support** - If routes work locally but not on Vercel, it may be a platform issue

## Expected Build Output

When building successfully, you should see in logs:
```
Route (app)                              Size     First Load JS
┌ ○ /api/documents                       0 B      ...
┌ ○ /api/test                            0 B      ...
```

If you don't see these routes listed, they're not being built.




