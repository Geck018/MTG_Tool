# Setting Up a Static URL for Your App

## The Problem
Each manual deployment via `wrangler pages deploy` creates a new preview URL like:
- `https://b1fe1087.mtg-deckbuilder.pages.dev`
- `https://a7966ff9.mtg-deckbuilder.pages.dev`

These URLs change with each deployment, which is annoying!

## The Solution: Production URL

Your app already has a **static production URL** that never changes:
- **`https://mtg-deckbuilder.pages.dev`**

This URL always points to your latest production deployment.

## How to Use the Static URL

### Option 1: Connect GitHub for Automatic Deployments (Recommended)

This way, every push to `main` automatically deploys to the static URL:

1. **Go to Cloudflare Dashboard:**
   - Visit: https://dash.cloudflare.com
   - Navigate to: **Workers & Pages** → **Pages**
   - Click on your project: **mtg-deckbuilder**

2. **Connect Git Repository:**
   - Click the **Settings** tab
   - Scroll to **"Builds & deployments"**
   - Click **"Connect to Git"**
   - Select **GitHub** and authorize
   - Choose repository: **Geck018/MTG_Tool**
   - Click **"Begin setup"**

3. **Configure Build Settings:**
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty)
   - **Node version:** `18` or higher

4. **Save and Deploy:**
   - Click **"Save and Deploy"**
   - Now every push to `main` will automatically deploy to `https://mtg-deckbuilder.pages.dev`

### Option 2: Use Production Flag with Wrangler

When deploying manually, use the `--branch=production` flag:

```bash
npm run build
npx wrangler pages deploy dist --project-name=mtg-deckbuilder --branch=production
```

This deploys directly to the production URL.

### Option 3: Set Up Custom Domain (Best for Long-term)

If you have a domain (e.g., `mtgdeckbuilder.com`):

1. **In Cloudflare Dashboard:**
   - Go to your Pages project
   - Click **"Custom domains"** tab
   - Click **"Set up a custom domain"**
   - Enter your domain (e.g., `mtgdeckbuilder.com`)

2. **Update DNS:**
   - Cloudflare will show you DNS records to add
   - Add them to your domain's DNS settings
   - Wait for DNS propagation (usually 5-15 minutes)

3. **Your app will be live at:**
   - `https://mtgdeckbuilder.com` (or your domain)

## Current Status

Your project is currently deployed manually, which is why you're getting changing preview URLs.

**To fix this immediately:**
1. Connect GitHub (Option 1 above) - **Recommended**
2. Or use `--branch=production` flag when deploying manually

## Quick Command for Static Production URL

```bash
npm run build
npx wrangler pages deploy dist --project-name=mtg-deckbuilder --branch=production
```

This will always deploy to: `https://mtg-deckbuilder.pages.dev`

## ✅ Your Static URLs

After deploying with `--branch=production`, you have TWO static URLs:

1. **Production URL (main):** `https://mtg-deckbuilder.pages.dev`
   - This is your primary static URL
   - Never changes between deployments
   - Always points to the latest production build

2. **Production Alias:** `https://production.mtg-deckbuilder.pages.dev`
   - Alternative static URL
   - Also never changes
   - Points to the same production build

**Use either of these URLs - they're both static and won't change!**
