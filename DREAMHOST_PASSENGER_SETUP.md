# Dreamhost Passenger Setup for RoadWeather

## Step-by-Step Passenger Configuration

### 1. Configure Domain in Dreamhost Panel

1. Log into **Dreamhost Panel**
2. Go to **Domains** → **Manage Domains**
3. Find `roadweather.app` and click **Edit** (or **Fully Host This Domain**)

### 2. Set Web Directory

- **Web directory:** `/home/yourusername/roadweather.app`
  - Replace `yourusername` with your actual Dreamhost username
  - This is where your frontend files are (index.html, static/, etc.)

### 3. Enable Passenger

- **Passenger:** ✅ **Enabled**
- **Passenger app type:** `Node.js`
- **Passenger app root:** `/home/yourusername/roadweather.app/backend`

### 4. File Structure on Server

Your server should have this structure:
```
/home/yourusername/roadweather.app/
├── index.html          (frontend)
├── static/             (frontend)
├── asset-manifest.json (frontend)
├── manifest.json       (frontend)
├── serve.json          (frontend)
├── .htaccess           (routing rules)
└── backend/
    ├── server.js
    ├── package.json
    ├── .env
    ├── routes/
    └── utils/
```

### 5. Install Backend Dependencies

Via SSH, run:
```bash
cd ~/roadweather.app/backend
npm install --production
```

### 6. Verify .env File

Make sure `/home/yourusername/roadweather.app/backend/.env` exists with:
```env
PORT=3000
MAPBOX_TOKEN=pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtam1lM2RteTFibnMzZG95cTNkcmp6cG4ifQ.JVhbzl61PK0gbQUscHhuVw
OPENWEATHER_KEY=3a4c4264b5f92df345d7f177b64cf469
NODE_ENV=production
```

### 7. Create public Directory (Required by Passenger)

Passenger needs a `public` directory. Create it:
```bash
cd ~/roadweather.app/backend
mkdir -p public
touch public/index.html
```

Add this to `backend/public/index.html`:
```html
<!DOCTYPE html>
<html>
<head><title>RoadWeather API</title></head>
<body><h1>RoadWeather API is running</h1></body>
</html>
```

### 8. Update server.js for Passenger

Passenger may need the app to listen differently. The current setup should work, but if you get errors, Passenger typically handles the port automatically.

### 9. Upload .htaccess File

Upload the `.htaccess` file to `/home/yourusername/roadweather.app/` (root directory).

### 10. Test the Setup

1. **Test frontend:** Visit `https://roadweather.app` - should show the app
2. **Test API health:** Visit `https://roadweather.app/api/health` - should return JSON
3. **Test API root:** Visit `https://roadweather.app/api/` - should return API status

### Troubleshooting

#### If API returns 404:
- Check Passenger app root is set to `/home/yourusername/roadweather.app/backend`
- Verify `backend/package.json` has `"start": "node server.js"`
- Check Passenger logs: `tail -f ~/roadweather.app/backend/logs/passenger.log`

#### If API returns 500:
- Check `.env` file exists and has correct values
- Verify dependencies installed: `cd backend && npm install`
- Check Node.js version: `node --version` (should be 16+)

#### If Passenger not starting:
- Verify Passenger is enabled in Dreamhost panel
- Check file permissions: `chmod 755 ~/roadweather.app/backend`
- Ensure `backend/public/` directory exists

#### Check Passenger Status:
```bash
cd ~/roadweather.app/backend
passenger-status
```

### Alternative: Use Express to Serve Static Files

If Passenger routing is complex, you can modify `backend/server.js` to also serve the frontend static files. This would require:
1. Moving frontend files into `backend/public/`
2. Adding `app.use(express.static('public'))` to server.js
3. Setting Passenger app root to `backend/`

But the .htaccess approach is cleaner and keeps frontend/backend separate.

