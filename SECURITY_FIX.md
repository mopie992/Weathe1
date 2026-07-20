# Security Fix: Remove Exposed API Keys from Git History

## Note

This guide exists because API keys were previously committed to git history.
**Do not paste real keys into this file** — use placeholders only.

Your local `.env` files and Railway env vars should already use rotated keys.
If you are unsure, rotate them again using Step 1.

## Step 1: Rotate Your API Keys (DO THIS FIRST!)

### OpenWeather API Key:
1. Go to https://home.openweathermap.org/api_keys
2. **Generate a NEW API key**
3. **Delete or disable the old key**
4. Update the new key in:
   - Railway environment variables (`OPENWEATHER_KEY`)
   - Your local `backend/.env` file

### Mapbox Token:
1. Go to https://account.mapbox.com/access-tokens/
2. **Create a NEW token**
3. **Revoke the old token** (if possible)
4. Update the new token in:
   - Railway environment variables (`MAPBOX_TOKEN`)
   - Your local `frontend/.env` file (`EXPO_PUBLIC_MAPBOX_TOKEN`)
5. Set URL restrictions on the public Mapbox token (e.g. `roadweather.app`, `localhost`)

---

## Step 2: Remove Keys from Git History

**WARNING: This rewrites git history. Only do this if you're the only one using the repo, or coordinate with your team first!**

### Option A: Using BFG Repo-Cleaner (Recommended)

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. Create a local `passwords.txt` (never commit this file) with lines like:

```
OLD_OPENWEATHER_KEY==>[REDACTED]
OLD_MAPBOX_TOKEN==>[REDACTED]
```

3. Run:

```bash
java -jar bfg.jar --replace-text passwords.txt
```

### Option B: Nuclear Option - Start Fresh (Easiest but loses history)

If you don't need git history:

```bash
# Create a new repo without history
rm -rf .git
git init
git add .
git commit -m "Initial commit - cleaned"
git remote add origin https://github.com/mopie992/Weathe1.git
git push -u origin main --force
```

**This deletes all commit history!**

---

## Step 3: Force Push (After cleaning history)

```bash
git push origin --force --all
git push origin --force --tags
```

**WARNING: Force push rewrites remote history. Make sure everyone knows!**

---

## Step 4: Verify Keys Are Removed

Search history for the old secret values **locally** (do not commit the values):

```bash
git log --all --full-history -S "PASTE_OLD_OPENWEATHER_KEY_HERE"
git log --all --full-history -S "PASTE_OLD_MAPBOX_TOKEN_HERE"
```

Should return nothing if successfully removed.

Also confirm working-tree docs have no real secrets:

```bash
rg -n "pk\\.eyJ|OPENWEATHER_KEY\\s*=\\s*[^\\s$\\{]" --glob '!**/node_modules/**' --glob '!**/.env'
```

---

## Step 5: Update All Services

After rotating keys, update:
- Railway environment variables
- Local `.env` files
- Any deployment platforms

---

## Important Notes

1. **Rotating keys is MORE IMPORTANT than cleaning history** — do this first
2. Git history cleaning is complex and risky — often not worth it for a POC
3. GitHub/GitGuardian may still show old commits in their cache
4. Never put live secrets into markdown, scripts, or chat logs

---

## Recommended Approach

**For a POC/demo project:**
1. Rotate both API keys
2. Update Railway and local `.env` files
3. Redact secrets from docs (this file)
4. Move forward with new keys

**For production:**
1. Rotate keys immediately
2. Clean git history if secrets remain in old commits
3. Force push cleaned history
4. Monitor for unauthorized usage
5. Keep URL restrictions and billing alerts on Mapbox
