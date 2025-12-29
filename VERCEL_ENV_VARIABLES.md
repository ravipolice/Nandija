# Vercel Environment Variables - Complete Setup

## ✅ Firebase Configuration (from PMD-Web app)

Copy these EXACT values to Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pmd-police-mobile-directory.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=pmd-police-mobile-directory
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=pmd-police-mobile-directory.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=603972083927
NEXT_PUBLIC_FIREBASE_APP_ID=1:603972083927:web:e4f268aabf3bf3d9f29092
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZV7LR981WS
```

## ✅ Apps Script Configuration

```
APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
```

## ✅ API URLs

```
NEXT_PUBLIC_DOCUMENTS_API=https://script.google.com/macros/s/AKfycby-7jOc_naI1_XDVzG1qAGvNc9w3tIU4ZwmCFGUUCLdg0_DEJh7oouF8a9iy5E93-p9zg/exec
NEXT_PUBLIC_DOCUMENTS_GET_ACTION=getDocuments
NEXT_PUBLIC_GALLERY_API=https://script.google.com/macros/s/AKfycbwXIhqfYWER3Z2KBlcrqZjyWCBfacHOeKCo_buWaZ6nG7qQpWaN91V7Y-IclzmOvG73/exec
```

## ✅ Build Configuration

```
NEXT_PUBLIC_STATIC_EXPORT=false
```

## Step-by-Step Instructions

### 1. Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Select your project: **pmd-webapp**

### 2. Navigate to Environment Variables
- Click **Settings** tab
- Click **Environment Variables** in left sidebar

### 3. Add Each Variable
For each variable above:
1. Click **Add New**
2. **Key**: Enter the variable name (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
3. **Value**: Enter the value (copy from above)
4. **Environment**: Select all three:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
5. Click **Save**

### 4. Verify All Variables Added
You should have **13 variables** total:
- 7 Firebase variables
- 2 Apps Script variables
- 3 API URL variables
- 1 Build configuration variable

### 5. Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Important Notes

⚠️ **Storage Bucket**: The value is `pmd-police-mobile-directory.firebasestorage.app` (not `.appspot.com`)

⚠️ **Messaging Sender ID**: `603972083927` (this is the actual value from Firebase)

⚠️ **App ID**: `1:603972083927:web:e4f268aabf3bf3d9f29092` (from PMD-Web app)

⚠️ **Measurement ID**: `G-ZV7LR981WS` (for Analytics, optional but good to include)

## After Setup

1. ✅ All environment variables set in Vercel
2. ✅ Redeployed application
3. ✅ Test `/api/documents` endpoint
4. ✅ Test documents page on Vercel
5. ✅ Verify Firebase authentication works

## Troubleshooting

### Variables Not Working
- Make sure you selected all environments (Production, Preview, Development)
- Redeploy after adding variables
- Check Vercel build logs for errors

### API Routes Still 404
- Verify `NEXT_PUBLIC_STATIC_EXPORT=false` is set
- Check Vercel Functions tab to see if route exists
- Check Vercel function logs for runtime errors

### Firebase Auth Issues
- Verify all Firebase variables are set correctly
- Check Firebase Console → Authentication → Authorized domains
- Make sure Vercel domain is added


