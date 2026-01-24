# Dual GitHub Account Setup

This setup allows you to use both your work account (`MCSteynMD`) and personal account (`Geck018`) on the same machine.

## How It Works

- **Work repositories** (outside "Personal Shit" folder): Uses work account
- **Personal repositories** (inside "Personal Shit" folder): Uses personal account

## Setup Steps

### 1. Update Personal Git Config

Edit `D:\Personal Shit\.gitconfig-personal` and set your personal email:

```ini
[user]
    name = Geck018
    email = your-actual-personal-email@example.com  # ← Update this!

[credential]
    helper = manager-core
```

### 2. Verify Current Repository

This repository (`MTGDeckbuilder`) is in your personal folder, so it will use:
- **Username:** Geck018
- **Email:** (from .gitconfig-personal)

### 3. Authenticate for This Push

When you push, you'll be prompted for credentials:
- **Username:** `Geck018`
- **Password:** Your personal access token

### 4. Work Repositories

For work repositories (anywhere else on your system):
- They'll use your global Git config (work account)
- No changes needed

## Testing

Check which account this repo is using:
```bash
git config user.name
git config user.email
```

Should show your personal account details.

## Alternative: Per-Repository Override

If you want to override for a specific repo:
```bash
git config user.name "Geck018"
git config user.email "your-email@example.com"
```

## SSH Alternative (More Secure)

If you prefer SSH for both accounts:

1. **Generate separate SSH keys:**
   ```bash
   # Personal key
   ssh-keygen -t ed25519 -C "personal@example.com" -f ~/.ssh/id_ed25519_personal
   
   # Work key (if needed)
   ssh-keygen -t ed25519 -C "work@example.com" -f ~/.ssh/id_ed25519_work
   ```

2. **Add to SSH config** (`~/.ssh/config`):
   ```
   # Personal GitHub
   Host github.com-personal
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_personal
   
   # Work GitHub
   Host github.com-work
     HostName github.com
     User git
     IdentityFile ~/.ssh/id_ed25519_work
   ```

3. **Update remote URLs:**
   ```bash
   # Personal repo
   git remote set-url origin git@github.com-personal:Geck018/MTG_Tool.git
   
   # Work repo
   git remote set-url origin git@github.com-work:work-org/repo.git
   ```
