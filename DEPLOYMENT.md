# Deployment Guide for Cloudflare

## Quick Answer: What You Need

For **Cloudflare Pages** (recommended):
1. ✅ Build command: `npm run build`
2. ✅ Output directory: `dist`
3. ✅ That's it! No special config needed.

For **Cloudflare Workers** (if you need serverless functions):
- You'd need to restructure the app significantly
- Workers are for serverless functions, not static sites
- Use Pages instead

---

## Cloudflare Pages Deployment

### Method 1: Connect GitHub Repository (Recommended - Automatic Deploys)

1. **First, push your code to GitHub** (see GIT_SETUP.md if needed)

2. **Go to Cloudflare Dashboard:**
   - Visit https://dash.cloudflare.com
   - Click "Workers & Pages" → "Pages"
   - Click "Create a project"
   - Choose "Connect to Git"
   - Select your GitHub account and repository: `Geck018/MTG_Tool`
   - Click "Begin setup"

3. **Configure build settings:**
   - **Project name:** `mtg-deckbuilder` (or your preferred name)
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty)
   - **Node version:** `18` or higher

4. **Click "Save and Deploy"**
   - Cloudflare will automatically build and deploy your app
   - Every push to `main` will trigger a new deployment

5. **Your app will be live at:** `https://mtg-deckbuilder.pages.dev` (or your custom domain)

### Method 2: Manual Upload (One-time)

1. **Build your app locally:**
   ```bash
   npm run build
   ```

2. **Go to Cloudflare Dashboard:**
   - Visit https://dash.cloudflare.com
   - Click "Workers & Pages" → "Pages"
   - Click "Create a project"
   - Choose "Upload assets"
   - Upload the `dist` folder

### Method 2: Via Wrangler CLI

1. **Install Wrangler:**
   ```bash
   npm install -g wrangler
   ```

2. **Login:**
   ```bash
   wrangler login
   ```

3. **Build and deploy:**
   ```bash
   npm run build
   wrangler pages deploy dist --project-name=mtg-deckbuilder
   ```

### Method 3: Via GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: mtg-deckbuilder
          directory: dist
```

---

## What Gets Deployed

When you run `npm run build`, Vite creates:
- `dist/index.html` - Main HTML file
- `dist/assets/` - All JS, CSS, and other assets
- `_redirects` - SPA routing rules (if needed)

All of this goes to Cloudflare Pages.

---

## Important Notes

1. **No API Keys Needed:** Scryfall API is public, no authentication required
2. **No Backend:** Your app is fully client-side, perfect for Pages
3. **localStorage:** User data stays in browser, no database needed
4. **CORS:** Scryfall API supports CORS, so your app will work from Pages

---

## Custom Domain

After deployment:
1. Go to your Pages project settings
2. Click "Custom domains"
3. Add your domain
4. Update DNS as instructed

---

## Troubleshooting

**404 errors on refresh:**
- The `_redirects` file should fix this
- Make sure it's in your `dist` folder after build

**Build fails:**
- Check Node version (needs 18+)
- Run `npm install` first
- Check for TypeScript errors: `npm run build`

**API errors:**
- Scryfall API might have rate limits
- Check browser console for CORS issues
- Verify API endpoints are correct
