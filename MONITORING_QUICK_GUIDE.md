# Quick API Usage Monitoring Guide

## 🚨 Set Up Alerts to Avoid Surprise Bills

### Mapbox Monitoring
1. **Go to**: https://account.mapbox.com/
2. **Check Usage**: Click "Usage" in sidebar
3. **Set Billing Alerts**: 
   - Go to "Billing" → "Alerts"
   - Set threshold (e.g., $10/month or 80% of free tier)
4. **Monitor**:
   - Directions API calls (you have 100k/month free)
   - Map loads (you have 50k/month free)

### OpenWeather Monitoring
1. **Go to**: https://home.openweathermap.org/
2. **Check Usage**: Click on your API key → View statistics
3. **Monitor**:
   - Calls per minute (limit: 60/min)
   - Calls per month (you have 1M/month free)
4. **Set Alerts**: Check subscription page for alert options

---

## 📊 Current Usage Pattern

### What Happens When Someone Searches a Route:

1. **Mapbox Directions API**: 1 call
   - Gets the route from origin to destination
   - Returns route coordinates and duration

2. **Mapbox Geocoding API**: 0-2 calls
   - Only if user enters address/place name (not coordinates)
   - Converts address to lat/lon

3. **OpenWeather API**: 16-34 calls (typically)
   - 2 calls per weather point (current + forecast)
   - Weather points: Every 30 minutes along route
   - Capped at 50 points max = 100 calls max per route
   - **Cached for 1 hour** (reduces repeat calls)

4. **Mapbox Map Load**: 1 load
   - When user opens the app

---

## 💰 Cost Breakdown (If You Exceed Free Tier)

### Mapbox:
- **Directions**: $0.50 per 1,000 requests
- **Map Loads**: $0.50 per 1,000 loads
- **Geocoding**: $0.50 per 1,000 requests

### OpenWeather:
- **Free Tier**: 1M calls/month
- **Paid Plans**: Start at $40/month for additional calls

---

## 🎯 Safe Usage Limits (Stay in Free Tier)

### Mapbox:
- **Directions**: Up to 100,000 routes/month = **~3,333 routes/day**
- **Map Loads**: Up to 50,000 page views/month = **~1,666 views/day**

### OpenWeather:
- **Calls**: Up to 1,000,000 calls/month = **~33,333 calls/day**
- **Rate Limit**: 60 calls/minute (not an issue with current usage)
- **At 34 calls per route**: **~29,411 routes/month** before hitting limit

---

## ⚠️ Warning Signs

Watch out for:
- **Sudden spike in usage** (could indicate a bug or attack)
- **Approaching 80% of free tier** (set alerts at this level)
- **Rate limit errors** (OpenWeather: 60 calls/min)

---

## 🔧 If You're Approaching Limits

1. **Increase cache time** (currently 1 hour → try 2-3 hours)
2. **Reduce weather points** (30 min intervals → 60 min intervals)
3. **Add route caching** (cache popular routes)
4. **Monitor for abuse** (check for unusual patterns)

---

## 📱 Quick Check Links

- **Mapbox Dashboard**: https://account.mapbox.com/
- **OpenWeather Dashboard**: https://home.openweathermap.org/
- **Mapbox Usage**: https://account.mapbox.com/usage/
- **OpenWeather API Keys**: https://home.openweathermap.org/api_keys

---

## ✅ Current Status

Based on typical usage:
- **Mapbox**: Well within free tier ✅
- **OpenWeather**: Well within free tier ✅
- **No immediate concerns** - but set up alerts anyway!

