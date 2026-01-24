# Git and GitHub Setup

## Push to GitHub

You need to authenticate with GitHub. Choose one method:

### Option 1: Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name like "MTG Tool Deploy"
   - Select scopes: `repo` (full control)
   - Copy the token

2. **Push using the token:**
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/Geck018/MTG_Tool.git
   git push -u origin main
   ```
   Replace `YOUR_TOKEN` with your actual token.

### Option 2: GitHub CLI

```bash
gh auth login
git push -u origin main
```

### Option 3: SSH (If you have SSH keys set up)

1. **Set up SSH key** (if not already):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Copy ~/.ssh/id_ed25519.pub to GitHub → Settings → SSH keys
   ```

2. **Use SSH remote:**
   ```bash
   git remote set-url origin git@github.com:Geck018/MTG_Tool.git
   git push -u origin main
   ```

## After Pushing

Once pushed, you can deploy to Cloudflare Pages via:
1. **GitHub Integration** (easiest) - See Cloudflare Pages setup below
2. **GitHub Actions** - Already configured in `.github/workflows/deploy.yml`
