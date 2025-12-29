# Fix Persistent 404 for /api/documents on Vercel

## Current Status
- ✅ Route file exists: `app/api/documents/route.ts`
- ✅ Route file is in git
- ✅ OPTIONS handler added
- ✅ vercel.json created
- ❌ Still getting 404 on Vercel

## Possible Causes

### 1. Vercel Deployment Not Updated
**Check**: Go to Vercel Dashboard → Deployments → Check if latest commit is deployed

**Solution**: 
- Wait for deployment to complete
- Or manually trigger redeploy

### 2. Next.js 15 API Route Runtime
**Issue**: Next.js 15 might need explicit runtime configuration

**Solution**: Added `export const runtime = 'nodejs';` to route.ts

### 3. Vercel Project Configuration
**Check**: Vercel Dashboard → Settings → General
- Framework Preset: Should be "Next.js"
- Build Command: Should be `npm run build` or auto-detected
- Output Directory: Should be `.next` or auto-detected

### 4. Route Not Being Built
**Check**: Vercel Build Logs
- Look for "API Routes" in build output
- Should see: `app/api/documents/route.ts`

**If missing**: Check for TypeScript/build errors

### 5. Vercel Function Not Created
**Check**: Vercel Dashboard → Deployments → Latest → Functions tab
- Should see `/api/documents` in the list
- If missing, the route isn't being recognized

## Immediate Actions

### Step 1: Verify Route File Structure
The route MUST be at:
```
app/api/documents/route.ts
```

And MUST export:
```typescript
export async function GET() { ... }
export async function POST() { ... }
export async function OPTIONS() { ... }
```

### Step 2: Check Vercel Build Logs
1. Go to Vercel Dashboard
2. Click on latest deployment
3. Check "Build Logs"
4. Look for errors related to:
   - TypeScript compilation
   - API route compilation
   - Missing dependencies

### Step 3: Check Vercel Function Logs
1. Go to Vercel Dashboard → Deployments → Latest
2. Click "Functions" tab
3. Look for `/api/documents`
4. If present, check logs for runtime errors
5. If missing, the route isn't being built

### Step 4: Test Build Locally
```bash
npm run build
```

Check output for:
- API Routes section
- Should list `app/api/documents/route.ts`

### Step 5: Verify Git Push
Make sure all changes are pushed:
```bash
git log --oneline -3
git push origin master
```

## Alternative Solutions

### Solution A: Use Pages Router (Temporary)
If App Router API routes aren't working, temporarily create:
```
pages/api/documents.ts
```

But this shouldn't be necessary with Next.js 15.

### Solution B: Check Vercel Plan
Free plan supports API routes, but check:
- Function execution time limits
- Memory limits
- Cold start issues

### Solution C: Add Route Handler Explicitly
Create a test route to verify API routes work:
```
app/api/test/route.ts
```

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API route works!' });
}
```

Test: `https://pmd-webapp.vercel.app/api/test`

If this works but `/api/documents` doesn't, there's an issue with the documents route specifically.

## Debugging Commands

### Check Route File
```bash
cat app/api/documents/route.ts | head -50
```

### Check Git Status
```bash
git status app/api/documents/route.ts
```

### Check Build Output
```bash
npm run build 2>&1 | grep -i "api\|route\|documents"
```

## Next Steps

1. ✅ Added `runtime = 'nodejs'` export
2. ⬜ Commit and push changes
3. ⬜ Wait for Vercel deployment
4. ⬜ Test `/api/documents` again
5. ⬜ Check Vercel function logs if still 404
6. ⬜ Create test route to verify API routes work

## If Still Not Working

1. **Contact Vercel Support** - They can check deployment logs
2. **Check Next.js 15 Docs** - Verify API route requirements
3. **Try Edge Runtime** - Change to `export const runtime = 'edge';`
4. **Check Vercel Status** - Make sure there are no service issues


