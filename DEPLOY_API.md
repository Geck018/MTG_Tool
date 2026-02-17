# Deploy API (manual / from built bundle)

Build the Worker locally (no Cloudflare login required):

```bash
npm run build:api
```

This writes **`dist-api/worker.js`** (single bundled file).

## Deploy options

1. **From this machine (with correct Cloudflare login)**  
   ```bash
   npm run deploy:api:dist
   ```
   Uses the pre-built `dist-api/worker.js` so no build runs during deploy.

2. **From another machine**  
   Copy the project (or at least `dist-api/`, `wrangler.deploy.toml`, and `node_modules` if you need to run wrangler) to a machine where you’re logged into the right Cloudflare account, then run:
   ```bash
   npm run deploy:api:dist
   ```

3. **Dashboard**  
   Cloudflare Dashboard → Workers & Pages → `mtg-deckbuilder-api` → Quick Edit → paste the contents of `dist-api/worker.js` → Save and Deploy. (D1 binding must already be set for this Worker.)
