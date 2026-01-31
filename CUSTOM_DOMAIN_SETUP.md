# Custom Domain Setup: tabletoptools.cc

## Local Configuration (Already Done)

The following local files have been configured for your domain:

- `index.html` - Updated with SEO meta tags, Open Graph tags, and canonical URL
- `public/favicon.svg` - Custom favicon for the site
- `public/robots.txt` - Search engine crawling rules
- `public/_redirects` - SPA routing + www to non-www redirect
- `public/_headers` - Security headers and caching rules

## Cloudflare Dashboard Setup

### Step 1: Add Custom Domain to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Pages**
3. Click on your project (e.g., `mtg-deckbuilder`)
4. Go to **Custom domains** tab
5. Click **Set up a custom domain**
6. Enter: `tabletoptools.cc`
7. Click **Continue**

### Step 2: DNS Configuration

Since you purchased the domain through Cloudflare, DNS should be automatic.

If not automatically configured, add these DNS records:

| Type  | Name | Content                          | Proxy |
|-------|------|----------------------------------|-------|
| CNAME | @    | mtg-deckbuilder.pages.dev        | Yes   |
| CNAME | www  | mtg-deckbuilder.pages.dev        | Yes   |

### Step 3: Verify Domain

1. Cloudflare will verify domain ownership
2. SSL certificate will be automatically provisioned
3. Wait 1-5 minutes for propagation

### Step 4: Set Primary Domain (Optional)

1. In Custom domains, click the three dots next to `tabletoptools.cc`
2. Select **Set as primary**
3. This ensures all traffic goes to the custom domain

## SSL/HTTPS Configuration

Cloudflare automatically handles SSL certificates. Verify these settings:

1. Go to **SSL/TLS** in your domain settings
2. Set encryption mode to **Full (strict)**
3. Enable **Always Use HTTPS**
4. Enable **Automatic HTTPS Rewrites**

## Additional Recommended Settings

### Page Rules (Optional)

1. Go to **Rules** → **Page Rules**
2. Add rule for `www.tabletoptools.cc/*`:
   - Setting: **Forwarding URL** (301 Permanent Redirect)
   - Destination: `https://tabletoptools.cc/$1`

### Speed Optimizations

1. Go to **Speed** → **Optimization**
2. Enable:
   - Auto Minify (JavaScript, CSS, HTML)
   - Brotli compression
   - Early Hints
   - Rocket Loader (test carefully)

### Security Settings

1. Go to **Security** → **Settings**
2. Set Security Level to **Medium** or **High**
3. Enable **Browser Integrity Check**
4. Enable **Hotlink Protection** (optional)

## Verify Everything Works

After setup, verify:

1. ✅ `https://tabletoptools.cc` loads correctly
2. ✅ `https://www.tabletoptools.cc` redirects to non-www
3. ✅ `http://tabletoptools.cc` redirects to HTTPS
4. ✅ SSL certificate is valid (check browser padlock)
5. ✅ All pages/routes work correctly

## Troubleshooting

### "DNS not configured correctly"
- Wait 5-10 minutes for DNS propagation
- Check DNS records are correct in dashboard

### "SSL certificate pending"
- Cloudflare provisions certs automatically
- Usually takes 1-15 minutes
- Check SSL/TLS → Edge Certificates

### "404 on page refresh"
- Verify `_redirects` file is in `public/` folder
- Verify it contains: `/*    /index.html   200`
- Redeploy if needed

### "Mixed content warnings"
- Enable **Automatic HTTPS Rewrites** in SSL/TLS settings
- Check for hardcoded `http://` URLs in code

## Future: Adding More Tools

When you add more tabletop tools to the site, consider:

1. **Subdomains**: `mtg.tabletoptools.cc`, `dnd.tabletoptools.cc`
2. **Routes**: `tabletoptools.cc/mtg`, `tabletoptools.cc/dnd`
3. **Separate Pages projects** that share the domain

The current setup supports all these approaches!
