# Deploy Frontend to Web

Your backend is already live at: `https://weathe1-production.up.railway.app`

## Option 1: Vercel (Recommended - Easiest)

### Step 1: Install Vercel CLI (if needed)
```bash
npm install -g vercel
```

### Step 2: Build the Web Version
```bash
cd frontend
npx expo export:web
```

This creates a `web-build` folder.

### Step 3: Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
cd frontend
vercel
```
Follow the prompts:
- Link to existing project? No (first time)
- Project name: weatherroute (or your choice)
- Directory: `./web-build`
- Override settings? No

**Option B: Using Vercel Website**
1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "New Project"
4. Import your GitHub repo: `mopie992/Weathe1`
5. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npx expo export:web`
   - **Output Directory**: `web-build`
   - **Install Command**: `npm install`
6. Add Environment Variable:
   - `EXPO_PUBLIC_MAPBOX_TOKEN` = your Mapbox token
   - `EXPO_PUBLIC_API_URL` = `https://weathe1-production.up.railway.app/api`
7. Click "Deploy"

### Step 4: Get Your URL
Vercel will give you a URL like: `https://weatherroute.vercel.app`

---

## Option 2: Netlify

### Step 1: Build
```bash
cd frontend
npx expo export:web
```

### Step 2: Deploy
1. Go to https://netlify.com
2. Sign up/login with GitHub
3. Drag and drop the `frontend/web-build` folder
4. Or connect your GitHub repo and set:
   - **Base directory**: `frontend`
   - **Build command**: `npx expo export:web`
   - **Publish directory**: `frontend/web-build`

### Step 3: Add Environment Variables
In Netlify dashboard → Site settings → Environment variables:
- `EXPO_PUBLIC_MAPBOX_TOKEN` = your Mapbox token
- `EXPO_PUBLIC_API_URL` = `https://weathe1-production.up.railway.app/api`

---

## Option 3: GitHub Pages (Free but requires more setup)

1. Build: `npx expo export:web`
2. Copy `web-build` contents to `docs` folder
3. Push to GitHub
4. Enable GitHub Pages in repo settings
5. Set source to `docs` folder

---

## Quick Test After Deployment

1. Visit your deployed URL
2. Try a route: `40.7128,-74.0060` (NYC)
3. Check browser console for any errors
4. Verify map loads and weather markers appear

---

## Troubleshooting

**Map not loading?**
- Check that `EXPO_PUBLIC_MAPBOX_TOKEN` is set in deployment environment variables

**API errors?**
- Verify backend is running: https://weathe1-production.up.railway.app/health
- Check that `EXPO_PUBLIC_API_URL` is set correctly

**Build fails?**
- Make sure you're in the `frontend` directory
- Run `npm install` first
- Check that all dependencies are installed

