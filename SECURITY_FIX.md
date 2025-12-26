# Security Fix: Remove Exposed API Keys from Git History

## ⚠️ CRITICAL: Your API keys are exposed in git history

GitGuardian detected your OpenWeather API key in commit history. Even though we removed it from current files, it's still visible in old commits.

## Step 1: Rotate Your API Keys (DO THIS FIRST!)

### OpenWeather API Key:
1. Go to https://home.openweathermap.org/api_keys
2. **Generate a NEW API key**
3. **Delete or disable the old key** (`9f85f2a889dbc649a5cb54e5bdc97831`)
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

---

## Step 2: Remove Keys from Git History

**⚠️ WARNING: This rewrites git history. Only do this if you're the only one using the repo, or coordinate with your team first!**

### Option A: Using git filter-branch (Built-in)

```bash
cd "C:\Users\karmp\Dropbox\AI_Stuffs\WeatherApp-1"

# Remove OpenWeather key from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch -r . && git reset --hard" \
  --prune-empty --tag-name-filter cat -- --all

# Remove specific string from all commits
git filter-branch --force --env-filter '
  if [ "$GIT_COMMIT" != "" ]; then
    export GIT_AUTHOR_DATE="$(git log -1 --format=%ai $GIT_COMMIT)"
    export GIT_COMMITTER_DATE="$(git log -1 --format=%ci $GIT_COMMIT)"
  fi
' --index-filter '
  git rm --cached --ignore-unmatch -r . 2>/dev/null || true
  git checkout-index -f -a
  find . -type f -exec sed -i "s/9f85f2a889dbc649a5cb54e5bdc97831/[REDACTED]/g" {} \;
  find . -type f -exec sed -i "s/pk\.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ\.pnMrqfJ4qv6_n9fKb8eNfQ/[REDACTED]/g" {} \;
' --prune-empty --tag-name-filter cat -- --all
```

### Option B: Using BFG Repo-Cleaner (Easier, but requires Java)

1. Download BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. Run:
```bash
java -jar bfg.jar --replace-text passwords.txt
```

Where `passwords.txt` contains:
```
9f85f2a889dbc649a5cb54e5bdc97831==>[REDACTED]
pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ.pnMrqfJ4qv6_n9fKb8eNfQ==>[REDACTED]
```

### Option C: Nuclear Option - Start Fresh (Easiest but loses history)

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

**⚠️ This deletes all commit history!**

---

## Step 3: Force Push (After cleaning history)

```bash
git push origin --force --all
git push origin --force --tags
```

**⚠️ WARNING: Force push rewrites remote history. Make sure everyone knows!**

---

## Step 4: Verify Keys Are Removed

```bash
# Check if keys still exist in any file
git log --all --full-history -S "9f85f2a889dbc649a5cb54e5bdc97831"
git log --all --full-history -S "pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ.pnMrqfJ4qv6_n9fKb8eNfQ"
```

Should return nothing if successfully removed.

---

## Step 5: Update All Services

After rotating keys, update:
- ✅ Railway environment variables
- ✅ Local `.env` files
- ✅ Any deployment platforms (Vercel, Netlify, etc.)

---

## Important Notes

1. **Rotating keys is MORE IMPORTANT than cleaning history** - Do this first!
2. Git history cleaning is complex and risky - consider if it's worth it
3. GitHub/GitGuardian may still show old commits in their cache
4. The exposed keys are already compromised - rotation is critical

---

## Recommended Approach

**For a POC/demo project:**
1. ✅ Rotate both API keys (most important!)
2. ✅ Update Railway and local .env files
3. ⚠️ Consider if cleaning history is worth the effort
4. ✅ Move forward with new keys

**For production:**
1. ✅ Rotate keys immediately
2. ✅ Clean git history
3. ✅ Force push cleaned history
4. ✅ Monitor for unauthorized usage

