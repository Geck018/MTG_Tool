# Switching Cloudflare Accounts

## Problem
You deployed to the wrong Cloudflare account and need to switch to your personal account.

## Solution: Switch Accounts

### Step 1: Logout from Current Account
```bash
npx wrangler logout
```

### Step 2: Login to Personal Account
```bash
npx wrangler login
```
This will open a browser window - make sure you log in with your **personal** Cloudflare account.

### Step 3: Verify Account
```bash
npx wrangler whoami
```
This shows which account you're logged into. Make sure it's your personal account.

### Step 4: Create Project in Personal Account
If the project doesn't exist in your personal account:
```bash
npx wrangler pages project create mtg-deckbuilder
```

### Step 5: Deploy to Personal Account
```bash
npm run build
npx wrangler pages deploy dist --project-name=mtg-deckbuilder --branch=production
```

## Alternative: Use Cloudflare Dashboard

1. **Logout:**
   - Go to: https://dash.cloudflare.com
   - Click your profile (top right)
   - Click "Logout"

2. **Login to Personal Account:**
   - Go to: https://dash.cloudflare.com
   - Log in with your **personal** Cloudflare credentials

3. **Create/Find Project:**
   - Navigate to: **Workers & Pages** → **Pages**
   - If project doesn't exist, click "Create a project"
   - Name it: `mtg-deckbuilder`

4. **Deploy:**
   - Use the dashboard to upload, or
   - Use wrangler CLI after logging in with personal account

## Important Notes

- Each Cloudflare account has separate projects
- The project in your work account won't appear in your personal account
- You'll need to create the project in your personal account if it doesn't exist
- Your static URL will be: `https://mtg-deckbuilder.pages.dev` (in your personal account)
