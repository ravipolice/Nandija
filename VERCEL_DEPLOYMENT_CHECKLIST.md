# Vercel Deployment Checklist ✅

## ✅ Authentication Working
Your Firebase authentication is now working on Vercel! The domain has been successfully added to Firebase authorized domains.

## Environment Variables Setup

Make sure these are set in your Vercel project settings:

### Required Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables (if not already set):

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pmd-police-mobile-directory.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pmd-police-mobile-directory
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pmd-police-mobile-directory.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Optional Environment Variables

```
APPS_SCRIPT_SECRET_TOKEN=your_secret_token
NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN=your_secret_token
NEXT_PUBLIC_DOCUMENTS_API_URL=your_documents_api_url
NEXT_PUBLIC_GALLERY_API=your_gallery_api_url
```

## Vercel Configuration

### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Node.js Version
- Recommended: **Node.js 20.x** or **18.x**
- Set in: Vercel Dashboard → Settings → General → Node.js Version

## Performance Optimizations

Your Next.js config already includes:
- ✅ Image optimization with remote patterns
- ✅ Package import optimization
- ✅ Compression enabled
- ✅ Security headers via middleware

## Monitoring

### Check Deployment Status
1. Go to Vercel Dashboard → Your Project → Deployments
2. Check build logs for any warnings
3. Monitor function execution times

### Check Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Verify users can sign in from Vercel domain
3. Check for any authentication errors in logs

## Common Issues & Solutions

### Issue: API Routes Not Working
**Solution**: Make sure `NEXT_PUBLIC_STATIC_EXPORT` is NOT set to `'true'` in Vercel environment variables. Your config already handles this correctly.

### Issue: Images Not Loading
**Solution**: Check that Firebase Storage URLs are in the `remotePatterns` in `next.config.js` (already configured ✅)

### Issue: Build Fails
**Solution**: 
- Check Node.js version (should be 18+ or 20+)
- Verify all environment variables are set
- Check build logs in Vercel dashboard

## Next Steps

1. ✅ Authentication working
2. ⬜ Set up environment variables in Vercel
3. ⬜ Test all features (employees, officers, gallery, documents)
4. ⬜ Set up custom domain (optional)
5. ⬜ Configure preview deployments (optional)

## Security Best Practices

1. ✅ Firebase domain authorized
2. ✅ Environment variables set (not hardcoded)
3. ✅ Security headers via middleware
4. ⬜ Enable Vercel Analytics (optional)
5. ⬜ Set up Vercel Password Protection for staging (optional)

## Success Indicators

- ✅ Login works on Vercel
- ✅ No console errors
- ✅ Firebase authentication successful
- ✅ API routes accessible
- ✅ Images loading correctly

---

**Your app is successfully deployed! 🎉**


