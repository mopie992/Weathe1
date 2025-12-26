# API Usage Monitoring Guide

## APIs Currently Used

### 1. **Mapbox** 
**What it's used for:**
- **Directions API** - Getting driving routes between two points
- **Mapbox GL JS** - Displaying maps on the web version

**Your Account:**
- Dashboard: https://account.mapbox.com/
- Usage: https://account.mapbox.com/access-tokens/
- Token: `[REDACTED - Check Railway environment variables]`

**Free Tier Limits:**
- **Directions API**: 100,000 requests/month free
- **Map Loads**: 50,000 map loads/month free
- After free tier: Pay-as-you-go pricing

**What to Monitor:**
- Directions API calls (every route search = 1 call)
- Map loads (every time someone opens the app = 1 load)

**Where to Check:**
1. Go to https://account.mapbox.com/
2. Click on your account → "Usage" or "Billing"
3. You'll see daily/monthly usage stats

---

### 2. **OpenWeather**
**What it's used for:**
- **Current Weather API** (`/data/2.5/weather`) - Real-time weather at a location
- **5 Day / 3 Hour Forecast API** (`/data/2.5/forecast`) - Weather forecasts

**Your Account:**
- Dashboard: https://home.openweathermap.org/
- API Key: `[REDACTED - Check Railway environment variables]`
- Usage: https://home.openweathermap.org/api_keys

**Free Tier Limits:**
- **60 calls/minute** (rate limit)
- **1,000,000 calls/month** free
- After free tier: Various paid plans

**What to Monitor:**
- API calls per minute (rate limit)
- Total calls per month
- Each route search makes **2 calls per weather point**:
  - 1 call for current weather
  - 1 call for forecast
- For a typical route with 17 weather points = **34 API calls**

**Where to Check:**
1. Go to https://home.openweathermap.org/
2. Click on your API key
3. View usage statistics and limits

---

## Usage Estimates

### Per Route Search:
- **Mapbox Directions**: 1 API call
- **Mapbox Map Load**: 1 load (when page loads)
- **OpenWeather**: 
  - 2 calls per weather point (current + forecast)
  - Typical route: ~17 points = **34 calls**
  - Long route (8 hours): ~17 points = **34 calls**

### Monthly Estimates (100 users, 10 routes each):
- **Mapbox Directions**: ~1,000 calls/month ✅ (well under 100k limit)
- **Mapbox Map Loads**: ~1,000 loads/month ✅ (well under 50k limit)
- **OpenWeather**: ~34,000 calls/month ✅ (well under 1M limit)

**You're well within free tier limits!**

---

## Cost Alerts Setup

### Mapbox:
1. Go to https://account.mapbox.com/billing/
2. Set up billing alerts
3. Set threshold (e.g., $10/month)

### OpenWeather:
1. Go to https://home.openweathermap.org/subscriptions
2. Check your current plan
3. Monitor usage in dashboard

---

## Optimization Tips

### Current Optimizations:
✅ **Weather caching** - Weather data cached for 1 hour (reduces API calls)
✅ **30-minute intervals** - Only fetch weather every 30 min along route (not every point)
✅ **Adaptive sampling** - Long routes use fewer weather points
✅ **Max 50 points** - Cap on weather points per route

### If You Hit Limits:
1. **OpenWeather**: Increase cache time (currently 1 hour)
2. **Mapbox**: Cache route results (not currently implemented)
3. **Reduce weather points**: Increase interval from 30 min to 60 min

---

## Quick Links

- **Mapbox Dashboard**: https://account.mapbox.com/
- **OpenWeather Dashboard**: https://home.openweathermap.org/
- **Mapbox Pricing**: https://www.mapbox.com/pricing/
- **OpenWeather Pricing**: https://openweathermap.org/price

---

## Important Notes

⚠️ **Your API keys were previously exposed in the repository**
- Consider rotating both keys for security
- New keys should be set in Railway environment variables
- Update frontend `.env` file with new Mapbox token

