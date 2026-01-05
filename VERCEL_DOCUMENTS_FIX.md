# Fix Documents Not Showing on Vercel

## Problem
Documents show on localhost but not on `https://pmd-webapp.vercel.app/documents`

## Root Causes

### 1. Missing Environment Variables in Vercel
The API route needs these environment variables that might not be set in Vercel:

- `APPS_SCRIPT_SECRET_TOKEN` or `NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN`
- `NEXT_PUBLIC_DOCUMENTS_API` (optional, has default)

### 2. API Route Failing Silently
The `/api/documents` route might be failing but returning empty arrays instead of errors.

### 3. Client-Side Fetch Issues
The client-side fetch to `/api/documents` might be failing on Vercel due to:
- CORS issues
- Network timeouts
- Missing error handling

## Solution Steps

### Step 1: Add Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these variables:

```
APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
NEXT_PUBLIC_DOCUMENTS_API=https://script.google.com/macros/s/AKfycby-7jOc_naI1_XDVzG1qAGvNc9w3tIU4ZwmCFGUUCLdg0_DEJh7oouF8a9iy5E93-p9zg/exec
```

3. **Important**: Set them for **Production**, **Preview**, and **Development** environments

4. **Redeploy** your application after adding variables

### Step 2: Check Vercel Function Logs

1. Go to **Vercel Dashboard** → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Check `/api/documents` function logs
5. Look for errors like:
   - Network errors
   - Timeout errors
   - Authentication errors

### Step 3: Test the API Route Directly

Test the API route directly in browser:
```
https://pmd-webapp.vercel.app/api/documents
```

Expected response: Array of documents or empty array `[]`

If you see an error, check:
- Network tab in browser DevTools
- Vercel function logs
- Console errors

### Step 4: Add Better Error Logging

The API route should log errors. Check Vercel function logs for:
- `📄 Documents API Route: Fetch failed`
- `📄 Documents API Route: Error response status`
- `📄 Documents API Route: JSON parse error`

## Quick Diagnostic Checklist

- [ ] Environment variables set in Vercel
- [ ] Variables set for all environments (Production, Preview, Development)
- [ ] Application redeployed after adding variables
- [ ] Checked Vercel function logs for errors
- [ ] Tested `/api/documents` endpoint directly
- [ ] Checked browser console for client-side errors
- [ ] Verified Apps Script URL is accessible

## Common Issues

### Issue 1: Environment Variables Not Applied
**Solution**: Make sure to redeploy after adding environment variables. Vercel doesn't apply them to existing deployments.

### Issue 2: Apps Script Timeout
**Solution**: Google Apps Script might be timing out. Check the timeout settings in Vercel (default is 10 seconds for Hobby plan).

### Issue 3: CORS Issues
**Solution**: The API route already includes CORS headers. If still having issues, check if Apps Script allows requests from Vercel domain.

### Issue 4: Token Authentication Failing
**Solution**: Verify the token matches what's in your Apps Script code (`helpers.gs`).

## Testing Locally vs Vercel

### Localhost Works Because:
- Environment variables are in `.env.local` or `.env`
- No CORS restrictions
- Direct network access

### Vercel Might Fail Because:
- Environment variables not set
- Different network environment
- Function timeout limits
- CORS restrictions

## Next Steps After Fix

1. **Monitor Logs**: Check Vercel function logs regularly
2. **Add Error Boundaries**: Add React error boundaries to catch client-side errors
3. **Add Loading States**: Show proper loading/error states in UI
4. **Test All Features**: Test upload, delete, preview after fix

## Debug Commands

### Check Environment Variables in Vercel
```bash
# Via Vercel CLI (if installed)
vercel env ls
```

### Test API Route Locally
```bash
# Make sure .env.local has the variables
curl http://localhost:3000/api/documents
```

### Test API Route on Vercel
```bash
curl https://pmd-webapp.vercel.app/api/documents
```





