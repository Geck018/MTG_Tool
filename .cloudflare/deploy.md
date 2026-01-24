# Cloudflare Deployment Guide

## Option 1: Cloudflare Pages (Recommended for Static Sites)

Your React/Vite app should be deployed to **Cloudflare Pages**, not Workers.

### Steps:

1. **Build your app:**
   ```bash
   npm run build
   ```
   This creates a `dist` folder with your static files.

2. **Deploy via Cloudflare Dashboard:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to Pages
   - Click "Create a project"
   - Connect your Git repository OR upload the `dist` folder directly
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/` (or leave empty)

3. **Deploy via Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler pages deploy dist --project-name=mtg-deckbuilder
   ```

### Configuration:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 18 or higher
- **Environment variables:** None required (Scryfall API is public)

## Option 2: Cloudflare Workers (If you need serverless functions)

If you want to use Workers for API proxying or serverless functions:

1. Install Wrangler:
   ```bash
   npm install -D wrangler
   ```

2. Create a Worker to serve static files (see `worker.js`)

3. Deploy:
   ```bash
   wrangler deploy
   ```

## Environment Variables (if needed later)

If you add authentication or other services:
- Add in Cloudflare Dashboard → Pages → Settings → Environment Variables
- Or in `wrangler.toml`:
  ```toml
  [vars]
  API_KEY = "your-key"
  ```
