# Setting Up Automatic Deployments from GitHub

## Overview
Connect your GitHub repository (`Geck018/MTG_Tool`) to Cloudflare Pages so that every push to `main` automatically triggers a build and deployment.

## Steps to Connect GitHub Repository

### Step 1: Go to Cloudflare Dashboard
1. Visit: https://dash.cloudflare.com
2. Make sure you're logged into your **personal** account (`marriesteyngcko@gmail.com`)
3. Navigate to: **Workers & Pages** → **Pages**

### Step 2: Open Your Project
1. Click on your project: **mtg-deckbuilder**
2. Click the **Settings** tab

### Step 3: Connect Git Repository
1. Scroll down to **"Builds & deployments"** section
2. Look for **"Source"** or **"Git integration"**
3. Click **"Connect to Git"** or **"Connect repository"**
4. You'll see options for Git providers - select **GitHub**
5. Authorize Cloudflare to access your GitHub account (if not already done)
6. Select your repository: **`Geck018/MTG_Tool`**
7. Click **"Begin setup"** or **"Save"**

### Step 4: Configure Build Settings
Make sure these settings are correct:

- **Production branch:** `main`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty)
- **Node version:** `18` or `20` (select from dropdown)
- **Framework preset:** Leave as "None" or select "Vite" if available

### Step 5: Save and Deploy
1. Click **"Save and Deploy"** or **"Save"**
2. Cloudflare will immediately trigger a build from your GitHub repository
3. You can watch the build progress in the **Deployments** tab

## What Happens Next

✅ **Every push to `main` branch** will automatically:
- Trigger a new build on Cloudflare
- Deploy to your production URL: `https://mtg-deckbuilder-bk7.pages.dev`
- Create a preview deployment for pull requests (if enabled)

## Verify It's Working

1. Make a small change to your code
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Go to Cloudflare Dashboard → Your project → Deployments
4. You should see a new deployment starting automatically!

## Troubleshooting

### "Connect to Git" Button Not Available
- The project might have been created via CLI without Git integration
- You may need to delete and recreate the project with Git integration
- OR: Check if there's an "Edit" or "Reconfigure" option in Settings

### Build Fails
- Check the build logs in the Deployments tab
- Verify Node version is 18 or higher
- Make sure build command is exactly: `npm run build`
- Verify output directory is exactly: `dist`

### Not Deploying on Push
- Verify the repository is connected (check Settings tab)
- Make sure you're pushing to the `main` branch
- Check if automatic deployments are enabled in Settings

## Alternative: Use GitHub Actions (Already Configured)

You already have a GitHub Actions workflow (`.github/workflows/deploy.yml`), but it requires Cloudflare API tokens. The Git integration method above is simpler and doesn't require tokens.

If you prefer GitHub Actions:
1. Get your Cloudflare API token from: https://dash.cloudflare.com/profile/api-tokens
2. Add secrets to GitHub repository:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (your account ID: `c88262391deb24e90743edc5cef00cf8`)
3. The workflow will deploy on every push to `main`
