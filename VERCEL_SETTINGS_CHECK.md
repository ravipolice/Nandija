# Vercel Settings Check - Based on Your Screenshot

## ✅ What Looks Good

From your Framework Settings screenshot:
- ✅ Framework Preset: **Next.js** (correct)
- ✅ Build Command: `npm run build` or `next build` (correct)
- ✅ Output Directory: **Next.js default** (should be `.next` - this is correct)
- ✅ Install Command: Auto-detected (correct)
- ✅ Development Command: `next` (correct)

## ⚠️ Critical Check: Environment Variables

The Framework Settings look correct. The issue is likely in **Environment Variables**.

### Check This Now:

1. In Vercel Dashboard, go to **Settings** → **Environment Variables** (not Framework Settings)
2. Look for: `NEXT_PUBLIC_STATIC_EXPORT`
3. **If it exists and is set to `true`**: This is the problem!
   - Delete it, OR
   - Change it to `false`
4. **If it doesn't exist**: That's good, but check for any other variables that might affect builds

## Next Steps

### Step 1: Verify Environment Variables
Go to: **Settings** → **Environment Variables** (different from Framework Settings)

Look for these variables:
- `NEXT_PUBLIC_STATIC_EXPORT` - Should NOT exist or be `false`
- `NEXT_PUBLIC_FIREBASE_*` - Should exist
- `APPS_SCRIPT_SECRET_TOKEN` - Should exist

### Step 2: Check Build Logs
1. Go to **Deployments** → Latest deployment
2. Click **Build Logs**
3. Look for:
   - "Route (app)" section
   - Should see: `app/api/test/route`
   - Should see: `app/api/documents/route`

### Step 3: Check Functions Tab
1. After deployment → **Functions** tab
2. Should see `/api/test` and `/api/documents` listed
3. If missing → Routes aren't being built

## If Output Directory is the Issue

If you want to be explicit (though "Next.js default" should work):

1. In Framework Settings, click **Override** for "Output Directory"
2. Set it to: `.next`
3. Click **Save**
4. Redeploy

But this shouldn't be necessary - "Next.js default" should work fine.

## Most Likely Fix

The Framework Settings look correct. The issue is almost certainly:

**`NEXT_PUBLIC_STATIC_EXPORT=true` in Environment Variables**

Fix:
1. Go to **Settings** → **Environment Variables**
2. Delete or set `NEXT_PUBLIC_STATIC_EXPORT` to `false`
3. Redeploy

## Quick Test

After fixing environment variables and redeploying:
- `https://pmd-webapp.vercel.app/api/test` - Should return JSON
- `https://pmd-webapp.vercel.app/api/documents` - Should return JSON


