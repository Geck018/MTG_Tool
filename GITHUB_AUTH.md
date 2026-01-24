# GitHub Authentication Setup

## Clear Existing Credentials

The system is currently authenticated as `MCSteynMD` (work account), but you need to use `Geck018` (personal account).

## Steps to Re-authenticate:

### Option 1: Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Name it: "MTG Tool Deploy"
   - Select scope: **`repo`** (full control of private repositories)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Push with token:**
   ```bash
   git push -u origin main
   ```
   - Username: `Geck018`
   - Password: **Paste your token** (not your actual password)

### Option 2: GitHub CLI

```bash
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate with browser or token
```

### Option 3: Manual Credential Update

1. Open Windows Credential Manager:
   - Press `Win + R`
   - Type: `control /name Microsoft.CredentialManager`
   - Go to "Windows Credentials"
   - Find any `git:https://github.com` entries
   - Delete them

2. Then push:
   ```bash
   git push -u origin main
   ```
   - Enter username: `Geck018`
   - Enter password: Your personal access token

## After Authentication

Once authenticated, future pushes will use the saved credentials automatically.
