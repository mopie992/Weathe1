# Troubleshooting Guide

## "Something went wrong" Error in Expo Go

### Step 1: Check the Error Details
1. In Expo Go, tap on the error message
2. Look for the red error screen with details
3. Note the specific error message

### Step 2: Common Issues

#### Issue: react-native-maps doesn't work in Expo Go
**Solution**: `react-native-maps` requires a custom development build and doesn't work in Expo Go.

**Quick Fix Options:**
1. **Use Web Version**: Press `w` in Expo terminal to open in browser
2. **Use Development Build**: Create a custom build (more complex)
3. **Use Alternative**: Switch to a web-based map solution

#### Issue: Backend Connection
**Check**: 
- Backend must be running on port 3000
- Phone and computer must be on same WiFi network
- Firewall might be blocking port 3000

**Fix**:
1. Make sure backend is running: `cd backend && npm start`
2. Check Windows Firewall allows port 3000
3. Verify IP address in services matches your computer's IP

#### Issue: Missing Dependencies
**Fix**: Run `npm install` in frontend folder

### Step 3: Get Detailed Error
Share the exact error message from Expo Go's error screen for more specific help.

