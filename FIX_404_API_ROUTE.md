# Fix 404 Error for /api/documents on Vercel

## Problem
The API route `/api/documents` returns 404 on Vercel but works on localhost.

## Root Cause
The route file exists but Vercel might not be detecting it properly, or there's a build/deployment issue.

## Solutions

### Solution 1: Verify Route File Location ✅
The route file should be at:
```
app/api/documents/route.ts
```

This is correct in your project.

### Solution 2: Check Vercel Build Logs
1. Go to **Vercel Dashboard** → Your Project → **Deployments**
2. Click on the latest deployment
3. Check **Build Logs** for any errors related to API routes
4. Look for messages like:
   - "Route not found"
   - "API route compilation errors"
   - "TypeScript errors"

### Solution 3: Force Redeploy
Sometimes Vercel needs a fresh deployment:
1. Go to **Vercel Dashboard** → Your Project
2. Click **Deployments** tab
3. Click **Redeploy** on the latest deployment
4. Or push a new commit to trigger a new deployment

### Solution 4: Check Next.js Version Compatibility
Your Next.js version (15.2.4) should support API routes. Verify:
- API routes are in `app/api/` directory (✅ correct)
- Route files export `GET`, `POST`, etc. functions (✅ correct)
- No `pages/api/` directory conflicting (check this)

### Solution 5: Verify Build Output
After deployment, check if the route is in the build:
1. In Vercel, go to deployment → **Functions** tab
2. Look for `/api/documents` in the list
3. If it's missing, the route isn't being built

### Solution 6: Add Runtime Configuration
I've added `vercel.json` to ensure API routes are properly configured. The file includes:
- Function timeout settings (30 seconds)
- Proper routing configuration

### Solution 7: Test Route Directly
After redeploying, test:
```
https://pmd-webapp.vercel.app/api/documents
```

Expected: JSON array `[]` or array of documents

## Immediate Actions

1. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Fix API route 404 - add OPTIONS handler and vercel.json"
   git push
   ```

2. **Wait for Vercel Deployment**
   - Vercel will automatically deploy
   - Wait for build to complete

3. **Test the Route**
   - Open: `https://pmd-webapp.vercel.app/api/documents`
   - Should return JSON (not 404)

4. **Check Function Logs**
   - If still 404, check Vercel function logs
   - Look for any errors

## Debugging Steps

### Step 1: Verify File Structure
```bash
# Should show route.ts file
ls -la app/api/documents/route.ts
```

### Step 2: Check Build Locally
```bash
npm run build
# Check if API routes are included in build output
```

### Step 3: Check Vercel Build
- Look for "API Routes" in build output
- Should see: `app/api/documents/route.ts`

### Step 4: Check Runtime
- In Vercel Functions tab, verify `/api/documents` exists
- Check function logs for errors

## Common Issues

### Issue: Route Not in Build
**Solution**: Make sure the file is committed and pushed to your repository.

### Issue: TypeScript Errors
**Solution**: Fix any TypeScript errors that might prevent the route from compiling.

### Issue: Next.js Config Issue
**Solution**: The `next.config.js` looks correct. Make sure `NEXT_PUBLIC_STATIC_EXPORT` is NOT set to `'true'`.

### Issue: Vercel Caching
**Solution**: Clear Vercel cache and redeploy.

## Next Steps After Fix

1. ✅ Route returns 200 (not 404)
2. ✅ Documents load on Vercel
3. ✅ Test upload functionality
4. ✅ Test delete functionality

## If Still Not Working

1. Check Vercel support/docs for Next.js 15 API routes
2. Verify your Vercel plan supports API routes (all plans do)
3. Check if there are any Vercel-specific configuration needed
4. Consider using Vercel Edge Functions if needed


