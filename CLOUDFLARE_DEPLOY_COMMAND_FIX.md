# Fix: Remove Deploy Command in Cloudflare Pages

## Problem
Cloudflare Pages is trying to run `npx wrangler deploy` which is for Workers, not static sites.

## Root Cause
A "Deploy command" is set in your Cloudflare Pages project settings. This needs to be removed.

## Solution: Remove Deploy Command

### Step 1: Go to Project Settings
1. Go to: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages** → **Pages** → Your project (`mtg-deckbuilder`)
3. Click on **Settings** tab

### Step 2: Find Build Settings
1. Scroll down to **"Builds & deployments"** section
2. Look for **"Deploy command"** field

### Step 3: Remove Deploy Command
1. **DELETE** or **EMPTY** the "Deploy command" field
2. Leave it completely blank
3. Click **"Save"**

### Step 4: Redeploy
1. Go back to **Deployments** tab
2. Click **"Retry deployment"** on the failed deployment
3. OR wait for the next automatic deployment

## Why This Works

For **Cloudflare Pages static sites**:
- ✅ Build command: `npm run build` (required)
- ✅ Output directory: `dist` (required)
- ❌ Deploy command: **NOT NEEDED** (should be empty)

Cloudflare Pages automatically:
- Takes the `dist` folder
- Deploys it as a static site
- No `wrangler deploy` needed!

## Expected Result

After removing the deploy command:
- ✅ Build succeeds (already working)
- ✅ No wrangler deploy attempt
- ✅ Static site deploys automatically
- ✅ App goes live!

## Alternative: If You Can't Find the Setting

If the deploy command field isn't visible:
1. Try **"Edit build configuration"** button
2. Or delete and recreate the project with correct settings:
   - Build command: `npm run build`
   - Output directory: `dist`
   - **Deploy command: LEAVE EMPTY**
