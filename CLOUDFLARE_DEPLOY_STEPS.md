# Cloudflare Pages Deployment - Step by Step

## ✅ Build Fixed!
All TypeScript errors have been fixed and the build is working.

## Deployment Steps

### Step 1: Go to Cloudflare Dashboard
1. Visit: https://dash.cloudflare.com
2. Log in to your Cloudflare account

### Step 2: Navigate to Pages
1. In the left sidebar, click **"Workers & Pages"**
2. Click **"Pages"** in the submenu
3. Click **"Create a project"** button

### Step 3: Connect Your Git Repository
1. Choose **"Connect to Git"**
2. You'll see a list of Git providers - click **"GitHub"**
3. Authorize Cloudflare to access your GitHub account (if not already done)
4. Select your repository: **`Geck018/MTG_Tool`**
5. Click **"Begin setup"**

### Step 4: Configure Build Settings
Fill in these settings:

- **Project name:** `mtg-deckbuilder` (or any name you prefer)
- **Production branch:** `main`
- **Framework preset:** Leave as "None" or select "Vite" if available
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty)
- **Environment variables:** None needed (leave empty)
- **Node version:** `18` or `20` (select from dropdown)

### Step 5: Deploy
1. Click **"Save and Deploy"**
2. Cloudflare will:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Run the build (`npm run build`)
   - Deploy the `dist` folder

### Step 6: Wait for Build
- You'll see the build progress in real-time
- First build usually takes 2-3 minutes
- Watch for any errors in the build logs

### Step 7: Access Your App
Once deployed, your app will be live at:
- `https://mtg-deckbuilder.pages.dev` (or your project name)

## Troubleshooting

### Build Fails
If the build fails, check:
1. **Build logs** - Click on the failed deployment to see error messages
2. **Node version** - Make sure it's set to 18 or higher
3. **Build command** - Should be exactly: `npm run build`
4. **Output directory** - Should be exactly: `dist`

### Common Issues

**"Build command failed"**
- Check that `npm run build` works locally (we just verified it does!)
- Make sure Node version is 18+

**"Cannot find module"**
- This usually means dependencies aren't installing
- Check that `package.json` is in the root directory

**"404 on routes"**
- Make sure `public/_redirects` file exists (it does!)
- It should contain: `/*    /index.html   200`

### Automatic Deployments
After the first deployment:
- Every push to `main` branch will trigger a new deployment
- You can see deployment history in the Cloudflare dashboard
- Each deployment gets a unique preview URL

## Next Steps After Deployment

1. **Custom Domain** (optional):
   - Go to your project settings
   - Click "Custom domains"
   - Add your domain
   - Follow DNS setup instructions

2. **Environment Variables** (if needed later):
   - Project settings → Environment variables
   - Add any API keys or secrets here

3. **Preview Deployments**:
   - Pull requests automatically get preview deployments
   - Great for testing before merging!
