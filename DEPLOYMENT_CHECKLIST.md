# RoadWeather Production Deployment Checklist

## Build Status
✅ **Web build completed successfully**
- Build location: `frontend/web-build/`
- Build date: December 29, 2025

## Files Ready for Deployment

### Required Files (upload to Dreamhost `roadweather.app`):
1. **index.html** - Main HTML file (with favicon links)
2. **manifest.json** - Web app manifest
3. **site.webmanifest** - PWA manifest
4. **serve.json** - Server configuration
5. **asset-manifest.json** - Asset mapping
6. **Favicon files:**
   - favicon.ico
   - favicon-96x96.png
   - favicon.svg
   - apple-touch-icon.png
7. **Static assets folder:**
   - `static/js/` - All JavaScript bundles
   - `static/js/*.map` - Source maps (optional, for debugging)
8. **Web app icons:**
   - web-app-manifest-192x192.png
   - web-app-manifest-512x512.png

## Deployment Steps

### 1. Upload Files to Dreamhost
- Connect via SFTP/FileZilla to `roadweather.app`
- Navigate to the public HTML directory (usually `public_html/` or `www/`)
- Upload ALL contents of `frontend/web-build/` folder
- Maintain the folder structure (especially the `static/` folder)

### 2. Verify File Structure on Server
```
public_html/
├── index.html
├── manifest.json
├── site.webmanifest
├── serve.json
├── asset-manifest.json
├── favicon.ico
├── favicon-96x96.png
├── favicon.svg
├── apple-touch-icon.png
├── web-app-manifest-192x192.png
├── web-app-manifest-512x512.png
└── static/
    └── js/
        ├── 428.42c68baf.js
        ├── 428.42c68baf.js.map
        ├── main.9d066861.js
        └── main.9d066861.js.map
```

### 3. Set File Permissions
- HTML files: 644
- JavaScript files: 644
- Directories: 755

### 4. Test the Deployment
1. Visit `https://roadweather.app`
2. Check browser console for errors
3. Verify map loads correctly
4. Test route search functionality
5. Verify weather markers display
6. Check favicon displays in browser tab

## Backend Configuration
✅ Backend is already deployed on Railway:
- URL: `https://weathe1-production.up.railway.app/api`
- Frontend is configured to use this backend automatically

## Environment Variables
✅ All environment variables are baked into the build:
- `EXPO_PUBLIC_MAPBOX_TOKEN` - Included in build
- `EXPO_PUBLIC_API_URL` - Set to Railway backend

## Post-Deployment Verification

### Functionality Checks:
- [ ] Homepage loads without errors
- [ ] Map displays correctly
- [ ] Current location detection works (or shows manual input)
- [ ] Route search works
- [ ] Weather markers display on map
- [ ] Slider updates weather preview
- [ ] Date/time picker works
- [ ] List view toggle works
- [ ] Weather detail modal opens on marker click
- [ ] Temperature unit toggle (C/F) works
- [ ] Favicon displays in browser tab

### Performance Checks:
- [ ] Page loads quickly (< 3 seconds)
- [ ] No console errors
- [ ] No 404 errors for assets
- [ ] API calls succeed

## Rollback Plan
If issues occur:
1. Keep previous build files as backup
2. Re-upload previous `web-build/` contents
3. Clear browser cache if needed

## Notes
- The build includes all dependencies bundled
- No server-side rendering required (static files)
- All API calls go to Railway backend
- Mapbox token is included in the build



