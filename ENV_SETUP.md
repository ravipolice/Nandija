# Environment Variables Setup

## Local Development (.env.local)

The `.env.local` file has been created with the necessary environment variables for local development.

**Important**: `.env.local` is in `.gitignore` and will NOT be committed to git. This is correct for security.

## Required Environment Variables

### Firebase Configuration
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase app ID

### Apps Script Configuration
- `APPS_SCRIPT_SECRET_TOKEN` - Secret token for Apps Script authentication
- `NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN` - Public version (for client-side if needed)

### API URLs
- `NEXT_PUBLIC_DOCUMENTS_API` - Google Apps Script Documents API URL
- `NEXT_PUBLIC_DOCUMENTS_GET_ACTION` - Action parameter for getting documents
- `NEXT_PUBLIC_GALLERY_API` - Google Apps Script Gallery API URL

### Build Configuration
- `NEXT_PUBLIC_STATIC_EXPORT` - Set to `false` for Vercel (enables API routes)

## Vercel Deployment

### Setting Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add ALL the variables from `.env.local`:
   - Click **Add New**
   - Enter variable name (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`)
   - Enter variable value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

3. **Important Variables to Set**:
   ```
   APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
   NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN=Ravi@PMD_2025_Secure_Token
   NEXT_PUBLIC_DOCUMENTS_API=https://script.google.com/macros/s/AKfycby-7jOc_naI1_XDVzG1qAGvNc9w3tIU4ZwmCFGUUCLdg0_DEJh7oouF8a9iy5E93-p9zg/exec
   NEXT_PUBLIC_GALLERY_API=https://script.google.com/macros/s/AKfycbwXIhqfYWER3Z2KBlcrqZjyWCBfacHOeKCo_buWaZ6nG7qQpWaN91V7Y-IclzmOvG73/exec
   NEXT_PUBLIC_STATIC_EXPORT=false
   ```

4. **Redeploy** after adding variables:
   - Go to **Deployments** tab
   - Click **Redeploy** on latest deployment
   - Or push a new commit

## Updating Firebase Config

If you need to update Firebase configuration:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pmd-police-mobile-directory`
3. Go to **Project Settings** → **General**
4. Scroll to **Your apps** section
5. Copy the config values
6. Update `.env.local` locally
7. Update in Vercel Dashboard → Environment Variables

## Security Notes

- ✅ `.env.local` is in `.gitignore` (not committed)
- ✅ `.env.example` is committed (template only, no secrets)
- ⚠️ Never commit `.env.local` to git
- ⚠️ Never share `.env.local` file
- ⚠️ Use Vercel environment variables for production

## Troubleshooting

### Variables Not Working Locally
1. Make sure `.env.local` exists in project root
2. Restart Next.js dev server: `npm run dev`
3. Check variable names (must start with `NEXT_PUBLIC_` for client-side)

### Variables Not Working on Vercel
1. Check Vercel Dashboard → Environment Variables
2. Make sure variables are set for correct environment (Production/Preview)
3. Redeploy after adding variables
4. Check Vercel build logs for errors

### API Routes Not Working
- Make sure `NEXT_PUBLIC_STATIC_EXPORT=false` (or not set)
- If set to `true`, API routes will be disabled


