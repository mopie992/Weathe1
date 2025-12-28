import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
// Use web map for web, placeholder for mobile
const MapViewComponent = Platform.OS === 'web' 
  ? require('./components/MapViewWeb').default
  : require('./components/MapViewPlaceholder').default;
import TimelineSlider from './components/TimelineSlider';
import WelcomeModal from './components/WelcomeModal';
import { getDirections } from './services/directionsService';
import { getWeather } from './services/weatherService';
import { geocode } from './services/geocodingService';
import * as Location from 'expo-location';

export default function App() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [departure, setDeparture] = useState(''); // Departure location (address or lat,lon)
  const [useCurrentLocation, setUseCurrentLocation] = useState(true); // Toggle to use current location (default true - auto-detect on load)
  const [destination, setDestination] = useState('');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDuration, setRouteDuration] = useState(null); // Route duration in seconds
  const [routeDistance, setRouteDistance] = useState(null); // Route distance in meters
  const [weatherPoints, setWeatherPoints] = useState([]); // Coordinates we fetched weather for (30-min intervals)
  const [weatherPointIndices, setWeatherPointIndices] = useState([]); // Route indices corresponding to weather points
  const [weatherHourlyData, setWeatherHourlyData] = useState([]); // Full hourly forecasts for weather points only
  const [weatherData, setWeatherData] = useState([]); // Current hour's weather data for display
  const [selectedTime, setSelectedTime] = useState(0); // Hours from now (for slider preview)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Try to get location automatically on load
  useEffect(() => {
    // Silently try to get location on page load
    requestLocationPermission(true); // true = silent mode (no alerts on failure)
  }, []);

  const requestLocationPermission = async (silent = false) => {
    try {
      console.log('Requesting location permission...');
      
      // For web, use browser's native geolocation API
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser');
        }

        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coords = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude
                };
                setCurrentLocation(coords);
                console.log('✅ Got location (web):', coords.latitude, coords.longitude);
                resolve(coords);
              },
              async (error) => {
                console.error('❌ Location error (web):', error);
                let errorMessage = 'Could not get your location.';
                let shouldTryIPFallback = false;
                
                if (error.code === 1) {
                  errorMessage = 'Location permission was denied. Please allow location access in your browser settings.';
                } else if (error.code === 2) {
                  // For laptops/desktops, try IP-based geolocation as fallback
                  shouldTryIPFallback = true;
                  errorMessage = 'Precise location unavailable (laptops don\'t have GPS). Trying approximate location...';
                } else if (error.code === 3) {
                  errorMessage = 'Location request timed out. Please try again.';
                }
                
                // Try IP-based geolocation as fallback for code 2 (position unavailable)
                if (shouldTryIPFallback) {
                  try {
                    console.log('Trying IP-based geolocation fallback...');
                    const ipResponse = await fetch('https://ipapi.co/json/');
                    const ipData = await ipResponse.json();
                    
                    if (ipData.latitude && ipData.longitude) {
                      const coords = {
                        latitude: ipData.latitude,
                        longitude: ipData.longitude
                      };
                      setCurrentLocation(coords);
                      console.log('✅ Got approximate location from IP:', coords.latitude, coords.longitude);
                      if (!silent) {
                        Alert.alert(
                          'Approximate Location',
                          `Using approximate location based on your IP address (${ipData.city || 'unknown'}, ${ipData.country_name || 'unknown'}). This may not be exact.`,
                          [{ text: 'OK' }]
                        );
                      }
                      resolve(coords);
                      return;
                    }
                  } catch (ipError) {
                    console.error('IP geolocation also failed:', ipError);
                  }
                }
                
                // If IP fallback failed or other error, handle silently or show error
                setCurrentLocation(null);
                if (!silent) {
                  setUseCurrentLocation(false);
                  Alert.alert(
                    'Location Error', 
                    errorMessage + (shouldTryIPFallback ? '\n\nPlease enter your departure location manually.' : ''),
                    [{ text: 'OK' }]
                  );
                } else {
                  // Silent mode: just log and keep checkbox checked for manual retry
                  console.log('Location unavailable (silent mode) - user can manually enter departure');
                }
                reject(error);
              },
              {
                enableHighAccuracy: false,
                timeout: 20000, // Increased timeout
                maximumAge: 60000
              }
            );
          });
        } catch (error) {
          // Error already handled in the callback, but catch to prevent unhandled rejection
          console.error('Geolocation promise rejected:', error);
          throw error; // Re-throw to be caught by outer catch block
        }
        return; // Exit early for web
      }

      // For mobile (iOS/Android), use Expo Location API
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      
      if (status !== 'granted') {
        console.log('Location permission denied - user must enter departure manually');
        setCurrentLocation(null);
        if (!silent) {
          Alert.alert(
            'Location Permission',
            'Location permission was denied. Please uncheck "Use Current Location" and enter your departure location manually.',
            [{ text: 'OK' }]
          );
          setUseCurrentLocation(false);
        } else {
          console.log('Location permission denied (silent mode) - user can manually enter departure');
        }
        return;
      }

      console.log('Getting current position...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      
      setCurrentLocation(coords);
      console.log('✅ Got location (mobile):', coords.latitude, coords.longitude);
    } catch (error) {
      console.error('❌ Location error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      setCurrentLocation(null);
      if (!silent) {
        setUseCurrentLocation(false);
        Alert.alert(
          'Location Error',
          `Could not get your location: ${error.message}. Please uncheck "Use Current Location" and enter your departure location manually.`,
          [{ text: 'OK' }]
        );
      } else {
        console.log('Location error (silent mode):', error.message);
      }
    }
  };

  const handleSearchRoute = async () => {
    // Validate required fields
    if (!destination.trim()) {
      Alert.alert('Error', 'Please enter a destination');
      return;
    }

    if (!useCurrentLocation && !departure.trim()) {
      Alert.alert('Error', 'Please enter a departure location or use current location');
      return;
    }

    if (useCurrentLocation && !currentLocation) {
      Alert.alert('Error', 'Current location not available. Please enable location services or enter a departure location.');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      // Parse departure location (either current location or entered location)
      let originCoords;
      if (useCurrentLocation) {
        originCoords = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        };
      } else {
        originCoords = await parseDestination(departure);
      }

      // Parse destination (could be address or lat,lon)
      const destCoords = await parseDestination(destination);
      
      const origin = `${originCoords.longitude},${originCoords.latitude}`;
      const dest = `${destCoords.longitude},${destCoords.latitude}`;

      // Get route
      const route = await getDirections(origin, dest);
      setRouteCoordinates(route.coordinates);
      setRouteDuration(route.duration); // Duration in seconds
      setRouteDistance(route.distance); // Distance in meters

      // CRITICAL: Only fetch weather for points we'll actually display (every 30 minutes)
      // This dramatically reduces API calls for long trips
      const { points: calculatedWeatherPoints, indices: calculatedWeatherIndices } = calculateWeatherPoints(route.coordinates, route.duration);
      setWeatherPoints(calculatedWeatherPoints); // Store which points we fetched weather for
      setWeatherPointIndices(calculatedWeatherIndices); // Store route indices for each weather point
      console.log(`Route: ${route.coordinates.length} total points, ${route.duration/60} min duration`);
      console.log(`Fetching weather for ${calculatedWeatherPoints.length} points (30-min intervals only)...`);
      
      // IMPORTANT: Fetch weather ONCE for all hours (0-48) - this is the ONLY API call
      // The slider will later switch between this cached data without making new API calls
      // Force clear cache to ensure fresh data (remove this after debugging)
      const weatherPromise = getWeather(calculatedWeatherPoints, true); // true = clearCache
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Weather request timed out after 30 seconds')), 30000)
      );

      try {
        const weatherHourly = await Promise.race([weatherPromise, timeoutPromise]);
        console.log('=== WEATHER DATA RECEIVED ===');
        console.log('Total points:', weatherHourly?.length || 0);
        
        if (weatherHourly && weatherHourly.length > 0) {
          // Log detailed info about each point
          console.log('🔍 RAW weatherHourly structure (first point):', {
            hasPoint: !!weatherHourly[0],
            pointKeys: weatherHourly[0] ? Object.keys(weatherHourly[0]) : 'no point',
            hasHourlyForecasts: !!weatherHourly[0]?.hourlyForecasts,
            hourlyForecastsKeys: weatherHourly[0]?.hourlyForecasts ? Object.keys(weatherHourly[0].hourlyForecasts) : 'no hourlyForecasts',
            hasHourly: !!weatherHourly[0]?.hourlyForecasts?.hourly,
            hourlyType: typeof weatherHourly[0]?.hourlyForecasts?.hourly,
            hourlyIsArray: Array.isArray(weatherHourly[0]?.hourlyForecasts?.hourly),
            hourlyLength: weatherHourly[0]?.hourlyForecasts?.hourly?.length || 0,
            fullFirstPoint: JSON.stringify(weatherHourly[0], null, 2).substring(0, 1000)
          });
          
          weatherHourly.forEach((point, idx) => {
            const hourlyLength = point.hourlyForecasts?.hourly?.length || 0;
            const hasCurrent = !!point.hourlyForecasts?.current;
            console.log(`Point ${idx}: ${point.lat},${point.lon} - hourlyLength=${hourlyLength}, hasCurrent=${hasCurrent}`);
            if (hourlyLength > 0) {
              console.log(`  ✅ First hourly: temp=${point.hourlyForecasts.hourly[0].temp}°C, condition=${point.hourlyForecasts.hourly[0].weather?.main}`);
              console.log(`  ✅ Last hourly: temp=${point.hourlyForecasts.hourly[hourlyLength-1].temp}°C`);
            } else {
              console.error(`  ❌ Point ${idx} has EMPTY hourly array!`, {
                hasHourlyForecasts: !!point.hourlyForecasts,
                hourlyForecastsKeys: point.hourlyForecasts ? Object.keys(point.hourlyForecasts) : 'no hourlyForecasts',
                hasHourly: !!point.hourlyForecasts?.hourly,
                hourlyType: typeof point.hourlyForecasts?.hourly,
                hourlyIsArray: Array.isArray(point.hourlyForecasts?.hourly)
              });
            }
          });
          
          const pointsWithHourly = weatherHourly.filter(p => (p.hourlyForecasts?.hourly?.length || 0) > 0).length;
          console.log(`✅ Points with hourly data: ${pointsWithHourly}/${weatherHourly.length}`);
          if (pointsWithHourly === 0) {
            console.error(`🚨 CRITICAL: NO points have hourly data even though backend returned it!`);
          }
        }
        
        if (!weatherHourly || weatherHourly.length === 0) {
          console.warn('No weather data received, using fallback');
          // Don't throw - just use empty data so route still shows
          setWeatherHourlyData([]);
          setWeatherData([]);
        } else {
          setWeatherHourlyData(weatherHourly);
          // Weather will be updated by useEffect when routeDuration is set
        }
        setSelectedTime(0);
      } catch (weatherError) {
        console.error('Weather fetch error (non-fatal):', weatherError);
        // Don't fail the whole search - show route without weather
        setWeatherHourlyData([]);
        setWeatherData([]);
        Alert.alert(
          'Weather Unavailable', 
          'Route loaded successfully, but weather data could not be fetched. The route is still visible on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Route search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch route or weather data';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const parseDestination = async (input) => {
    // Simple parsing - if it's lat,lon format, use it directly
    const latLonMatch = input.match(/(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (latLonMatch) {
      return {
        latitude: parseFloat(latLonMatch[1]),
        longitude: parseFloat(latLonMatch[2])
      };
    }

    // Otherwise, use geocoding API to convert place name/address to coordinates
    try {
      const result = await geocode(input.trim());
      return {
        latitude: result.latitude,
        longitude: result.longitude
      };
    } catch (error) {
      throw new Error(error.message || `Could not find location: "${input}"`);
    }
  };

  /**
   * Calculate which route points we need weather for (every 30 minutes)
   * Returns both the coordinates and their corresponding route indices
   * This reduces API calls by only fetching weather for displayed markers
   */
  const calculateWeatherPoints = (routeCoordinates, routeDurationSeconds) => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !routeDurationSeconds) {
      return { points: [], indices: [] };
    }

    const totalDurationMinutes = routeDurationSeconds / 60;
    const INTERVAL_MINUTES = 30;
    
    // Calculate which points we need (every 30 minutes)
    const weatherPoints = [];
    const weatherIndices = [];
    const numPoints = routeCoordinates.length;
    const usedIndices = new Set();

    // Always include first point
    weatherPoints.push(routeCoordinates[0]);
    weatherIndices.push(0);
    usedIndices.add(0);

    // Add points at 30-minute intervals
    let targetMinutes = INTERVAL_MINUTES;
    while (targetMinutes < totalDurationMinutes) {
      // Calculate which route point corresponds to this time
      const progress = targetMinutes / totalDurationMinutes;
      const pointIndex = Math.min(
        Math.floor(progress * (numPoints - 1)),
        numPoints - 1
      );
      
      // Make sure we haven't used this index and it's valid
      if (pointIndex > 0 && pointIndex < numPoints && !usedIndices.has(pointIndex)) {
        weatherPoints.push(routeCoordinates[pointIndex]);
        weatherIndices.push(pointIndex);
        usedIndices.add(pointIndex);
        console.log(`Added weather point at ${targetMinutes} min (index ${pointIndex}, progress ${(progress*100).toFixed(1)}%)`);
      }
      
      targetMinutes += INTERVAL_MINUTES;
    }

    // Always include last point if not already included
    const lastIndex = numPoints - 1;
    if (!usedIndices.has(lastIndex)) {
      weatherPoints.push(routeCoordinates[lastIndex]);
      weatherIndices.push(lastIndex);
      usedIndices.add(lastIndex);
    }

    console.log(`Calculated ${weatherPoints.length} weather points for ${totalDurationMinutes.toFixed(1)} min trip (30-min intervals)`);
    console.log(`Weather points:`, weatherPoints.map((p, i) => `Point ${i}: ${p.lat.toFixed(4)},${p.lon.toFixed(4)} (route index ${weatherIndices[i]})`));
    return { points: weatherPoints, indices: weatherIndices };
  };

  /**
   * Calculate estimated arrival time at each point along the route
   * Based on departure time and route duration
   * Each point shows weather at the time you'll arrive there
   */
  const calculateEstimatedArrivalTimes = (departureOffsetMinutes, routeDurationSeconds) => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !routeDurationSeconds) {
      return [];
    }

    const departureTime = new Date(Date.now() + departureOffsetMinutes * 60 * 1000);
    const totalDurationMinutes = routeDurationSeconds / 60;
    const numPoints = routeCoordinates.length;

    // Calculate estimated arrival time at each point
    // Assume uniform speed along the route
    return routeCoordinates.map((_, index) => {
      // Calculate progress (0 to 1) along the route
      const progress = index / (numPoints - 1);
      // Calculate elapsed time in minutes from departure
      const elapsedMinutes = progress * totalDurationMinutes;
      // Calculate arrival time at this point (departure + elapsed time)
      const arrivalTime = new Date(departureTime.getTime() + elapsedMinutes * 60 * 1000);
      // Calculate hours from NOW (not from departure) for weather lookup
      const hoursFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const minutesFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60);
      
      console.log(`Point ${index}: Progress ${(progress * 100).toFixed(1)}%, Elapsed ${elapsedMinutes.toFixed(1)}min, Arrival in ${hoursFromNow.toFixed(2)}h from now`);
      
      return {
        pointIndex: index,
        arrivalTime,
        hoursFromNow,
        minutesFromNow,
        elapsedMinutesFromDeparture: elapsedMinutes,
        progress: progress
      };
    });
  };

  /**
   * Extract weather data based on estimated arrival times at each point
   * No API call - just switches between already-fetched data
   * Note: hourlyData only contains weather for the 30-min interval points we fetched
   */
  const extractWeatherForEstimatedTimes = (hourlyData, arrivalTimes) => {
    if (!hourlyData || hourlyData.length === 0 || !weatherPoints || weatherPoints.length === 0) {
      return [];
    }

    try {
      // hourlyData has weather for the 30-min interval points (weatherPoints)
      // We already know which route indices correspond to each weather point (weatherPointIndices)
      // Use that mapping directly instead of trying to match coordinates
      
      // Process each weather point we fetched
      return hourlyData.map((pointData, weatherIndex) => {
        const { lat, lon, hourlyForecasts } = pointData;
        if (!hourlyForecasts) {
          console.warn('Missing hourlyForecasts for point:', lat, lon);
          return null;
        }

        // DEBUG: Log the structure of hourlyForecasts
        if (weatherIndex === 0) {
          console.log('🔍 DEBUG: First weather point structure:', {
            hasHourlyForecasts: !!hourlyForecasts,
            hourlyForecastsType: typeof hourlyForecasts,
            hasHourly: !!hourlyForecasts?.hourly,
            hourlyType: typeof hourlyForecasts?.hourly,
            hourlyIsArray: Array.isArray(hourlyForecasts?.hourly),
            hourlyLength: hourlyForecasts?.hourly?.length || 0,
            hasCurrent: !!hourlyForecasts?.current,
            fullStructure: JSON.stringify(hourlyForecasts, null, 2).substring(0, 500)
          });
        }

        // Use the stored route index mapping instead of coordinate matching
        const routeIndex = weatherPointIndices[weatherIndex];
        if (routeIndex === undefined || routeIndex === null) {
          console.warn(`No route index mapping for weather point ${weatherIndex}: ${lat},${lon}`);
          return null;
        }
        
        if (routeIndex < 0 || routeIndex >= routeCoordinates.length) {
          console.warn(`Invalid route index ${routeIndex} for weather point ${weatherIndex}`);
          return null;
        }
        const arrivalInfo = arrivalTimes[routeIndex];
        if (!arrivalInfo) {
          return null;
        }

        // Calculate which forecast interval to use based on arrival time
        // hoursFromNow is the time from NOW when you'll arrive at this point
        const hoursFromNow = arrivalInfo.hoursFromNow;
        const minutesFromNow = arrivalInfo.minutesFromNow;
        let weather;

        if (hoursFromNow <= 0) {
          // Already passed or current - use current weather
          weather = hourlyForecasts.current;
          console.log(`Point ${weatherIndex}: Using current weather (arrival in past/now)`);
        } else if (minutesFromNow < 60) {
          // Less than 1 hour away - use current weather (closest we have)
          weather = hourlyForecasts.current;
          console.log(`Point ${weatherIndex}: Using current weather (arrival in ${minutesFromNow.toFixed(0)}min)`);
        } else {
          // More than 1 hour away - map to 3-hour interval index
          // OpenWeather 5-day forecast returns data in 3-hour intervals
          // The first forecast item (index 0) is typically 3 hours from now
          // So: 0-3h = current, 3-6h = index 0, 6-9h = index 1, 9-12h = index 2, etc.
          // Formula: intervalIndex = floor((hoursFromNow - 3) / 3), clamped to valid range
          let intervalIndex = Math.floor((hoursFromNow - 3) / 3);
          intervalIndex = Math.max(0, intervalIndex); // Don't allow negative
          
          console.log(`Point ${weatherIndex}: hoursFromNow=${hoursFromNow.toFixed(2)}, calculated intervalIndex=${intervalIndex}, hourlyLength=${hourlyForecasts.hourly?.length || 0}`);
          
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
              console.log(`Point ${weatherIndex}: Using forecast interval ${intervalIndex}/${hourlyForecasts.hourly.length - 1} (arrival in ${hoursFromNow.toFixed(1)}h, temp: ${weather.temp}°C, condition: ${weather.weather?.main || 'N/A'})`);
            } else {
              // Beyond forecast range, use last available
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
              console.log(`Point ${weatherIndex}: Beyond forecast (${intervalIndex} >= ${hourlyForecasts.hourly.length}), using last available (arrival in ${hoursFromNow.toFixed(1)}h, temp: ${weather.temp}°C)`);
            }
          } else {
            // No hourly data, use current
            weather = hourlyForecasts.current;
            console.error(`❌ Point ${weatherIndex}: No hourly data!`, {
              hasHourly: !!hourlyForecasts.hourly,
              hourlyType: typeof hourlyForecasts.hourly,
              hourlyIsArray: Array.isArray(hourlyForecasts.hourly),
              hourlyLength: hourlyForecasts.hourly?.length || 0,
              hasCurrent: !!hourlyForecasts.current
            });
          }
        }

        if (!weather || !weather.weather) {
          console.warn('Invalid weather data for point:', lat, lon);
          return null;
        }

        return {
          lat,
          lon,
          arrivalTime: arrivalInfo.arrivalTime,
          hoursFromNow: arrivalInfo.hoursFromNow,
          timestamp: weather.timestamp || Math.floor(arrivalInfo.arrivalTime.getTime() / 1000),
          weather: {
            temp: weather.temp || 20,
            precip: (weather.precip && weather.precip['1h']) || 0,
            precip_type: (weather.weather && weather.weather.main) ? weather.weather.main.toLowerCase() : 'clear',
            wind: weather.wind_speed || 0,
            wind_deg: weather.wind_deg || 0,
            humidity: weather.humidity || 50,
            condition: (weather.weather && weather.weather.main) || 'Clear',
            description: (weather.weather && weather.weather.description) || 'clear sky'
          }
        };
      }).filter(item => item !== null);
    } catch (error) {
      console.error('Error extracting weather for estimated times:', error);
      return [];
    }
  };

  /**
   * Extract weather data for a specific hour from cached hourly forecasts (for slider preview)
   * No API call - just switches between already-fetched data
   */
  const extractWeatherForHour = (hourlyData, hoursFromNow) => {
    if (!hourlyData || hourlyData.length === 0) return [];

    try {
      return hourlyData.map((pointData) => {
        const { lat, lon, hourlyForecasts } = pointData;
        if (!hourlyForecasts) {
          console.warn('Missing hourlyForecasts for point:', lat, lon);
          return null;
        }
        
        // Debug: Log structure on first point only
        if (hourlyData.indexOf(pointData) === 0 && hoursFromNow > 0) {
          console.log('Debug hourlyForecasts structure:', {
            hasCurrent: !!hourlyForecasts.current,
            hasHourly: !!hourlyForecasts.hourly,
            hourlyLength: hourlyForecasts.hourly?.length || 0,
            hourlyType: Array.isArray(hourlyForecasts.hourly),
            hourlySample: hourlyForecasts.hourly?.[0]
          });
        }

        let weather;

        if (hoursFromNow === 0) {
          // Current weather
          weather = hourlyForecasts.current;
        } else if (hoursFromNow > 0) {
          // OpenWeather 5-day forecast gives 3-hour intervals (not true hourly)
          // Map slider hours to 3-hour interval index
          // Hour 1-3 = index 0, Hour 4-6 = index 1, etc.
          // intervalIndex = 0 for hours 1-3, 1 for hours 4-6, 2 for hours 7-9, etc.
          const intervalIndex = Math.floor((hoursFromNow - 1) / 3);
          
          // Check if hourly array exists and has data
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
              console.log(`Hour +${hoursFromNow}: Using 3-hour interval index ${intervalIndex}/${hourlyForecasts.hourly.length - 1}, temp: ${weather.temp}°C`);
            } else {
              // If beyond available forecast, use the last available forecast
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
              console.log(`Hour +${hoursFromNow}: Beyond forecast range (${hourlyForecasts.hourly.length} intervals), using last available, temp: ${weather.temp}°C`);
            }
          } else {
            // No hourly data available - fallback to current
            console.warn(`No hourly forecast array available for hour +${hoursFromNow}, using current. hourlyForecasts:`, hourlyForecasts);
            weather = hourlyForecasts.current;
          }
        } else {
          // Fallback to current for any other case
          weather = hourlyForecasts.current;
        }

        if (!weather || !weather.weather) {
          console.warn('Invalid weather data for point:', lat, lon);
          return null;
        }

        return {
          lat,
          lon,
          timestamp: weather.timestamp || Math.floor(Date.now() / 1000),
          weather: {
            temp: weather.temp || 20,
            precip: (weather.precip && weather.precip['1h']) || 0,
            precip_type: (weather.weather && weather.weather.main) ? weather.weather.main.toLowerCase() : 'clear',
            wind: weather.wind_speed || 0,
            wind_deg: weather.wind_deg || 0,
            humidity: weather.humidity || 50,
            condition: (weather.weather && weather.weather.main) || 'Clear',
            description: (weather.weather && weather.weather.description) || 'clear sky'
          }
        };
      }).filter(item => item !== null); // Remove null entries
    } catch (error) {
      console.error('Error extracting weather for hour:', error);
      return [];
    }
  };

  const handleTimeChange = (hours) => {
    setSelectedTime(hours);
    updateWeatherForDepartureTime(0, hours); // Always use 0 (NOW) for departure
  };

  const updateWeatherForDepartureTime = (departureOffsetMinutes, previewHoursOffset = 0) => {
    // IMPORTANT: No API call here - just switch between cached hourly data
    if (weatherHourlyData.length === 0 || !routeDuration) {
      console.warn('No cached weather data or route duration available');
      return;
    }

    // Calculate estimated arrival times at each point
    const arrivalTimes = calculateEstimatedArrivalTimes(departureOffsetMinutes, routeDuration);
    
    // If preview offset is set (from slider), adjust arrival times
    // This shifts the departure time forward/backward to preview different scenarios
    if (previewHoursOffset !== 0) {
      arrivalTimes.forEach(arrival => {
        arrival.hoursFromNow += previewHoursOffset;
        arrival.minutesFromNow += previewHoursOffset * 60;
        arrival.arrivalTime = new Date(arrival.arrivalTime.getTime() + previewHoursOffset * 60 * 60 * 1000);
      });
    }

    // Extract weather for estimated arrival times
    // Note: weatherHourlyData only contains data for 30-min interval points
    // extractWeatherForEstimatedTimes will map it to route coordinates
    const weatherForTimes = extractWeatherForEstimatedTimes(weatherHourlyData, arrivalTimes);
    
    // Since we already fetched only 30-min interval points, include all of them
    // The filter function will ensure first/last are included
    const filteredWeatherData = filterWeatherTo30MinIntervals(weatherForTimes);
    setWeatherData(filteredWeatherData);
    
    console.log(`Updated weather for departure +${departureOffsetMinutes}min, preview +${previewHoursOffset}h`);
    console.log(`Showing ${filteredWeatherData.length} markers (30-min intervals)`);
  };

  /**
   * Filter weather data to only show markers at 30-minute intervals
   * Note: weatherData already contains arrivalTime info, so we use that directly
   */
  const filterWeatherTo30MinIntervals = (weatherData) => {
    if (!weatherData || weatherData.length === 0) {
      return [];
    }

    const filtered = [];
    let lastShownMinutes = -Infinity;
    const INTERVAL_MINUTES = 30;
    const TOLERANCE_MINUTES = 5; // Allow 5 min tolerance for rounding

    weatherData.forEach((weatherItem, index) => {
      if (!weatherItem || !weatherItem.arrivalTime) {
        console.warn(`Missing arrivalTime for weather item ${index}`);
        return;
      }

      // Calculate elapsed minutes from departure
      // We need to get this from the arrivalTime - but we don't have departure time here
      // Actually, the weatherItem should have hoursFromNow which we can use
      // For now, let's just include all points since they're already at 30-min intervals
      // But we'll keep the first/last logic
      
      const isFirst = index === 0;
      const isLast = index === weatherData.length - 1;
      
      // Since we already fetched only 30-min interval points, include all of them
      // But ensure they're spaced properly
      if (isFirst || isLast) {
        filtered.push(weatherItem);
        console.log(`✓ Including ${isFirst ? 'first' : 'last'} marker at index ${index}`);
      } else {
        // For intermediate points, check if they're at reasonable intervals
        // Since we already calculated them at 30-min intervals, include them all
        filtered.push(weatherItem);
        console.log(`✓ Including intermediate marker at index ${index}`);
      }
    });

    console.log(`Including ${filtered.length} markers (already at 30-min intervals)`);
    return filtered;
  };

  // Update weather when route or preview slider changes
  useEffect(() => {
    if (weatherHourlyData.length > 0 && routeDuration && routeCoordinates.length > 0) {
      updateWeatherForDepartureTime(0, selectedTime); // Always use 0 (NOW) for departure
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTime, routeDuration, routeCoordinates.length, weatherHourlyData.length]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => setError(null)}
          >
            <Text style={styles.buttonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Welcome Modal - Shows on first visit */}
      <WelcomeModal />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        {/* Departure Location */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Departure:</Text>
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={async () => {
                const newValue = !useCurrentLocation;
                setUseCurrentLocation(newValue);
                
                if (newValue) {
                  // User is checking "Use Current Location" - request permission now (user gesture)
                  setDeparture(''); // Clear departure when switching to current location
                  await requestLocationPermission();
                } else {
                  // User is unchecking - clear location
                  setCurrentLocation(null);
                }
              }}
            >
              <Text style={styles.checkboxText}>
                {useCurrentLocation ? '✓' : '○'} Use Current Location
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {!useCurrentLocation && (
          <TextInput
            style={[styles.input, styles.inputFullWidth]}
            placeholder="Enter departure (address or lat,lon)"
            value={departure}
            onChangeText={setDeparture}
          />
        )}
        {useCurrentLocation && currentLocation && (
          <Text style={styles.currentLocationText}>
            Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
        
        {/* Destination Location */}
        <View style={styles.inputRow}>
          <Text style={styles.inputLabel}>Destination:</Text>
        </View>
        <TextInput
          style={[styles.input, styles.inputFullWidth]}
          placeholder="Enter destination (address or lat,lon)"
          value={destination}
          onChangeText={setDestination}
        />
        
        {/* Search Button */}
        <TouchableOpacity
          style={[styles.button, styles.searchButton]}
          onPress={handleSearchRoute}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Search Route'}</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          currentLocation={currentLocation}
          routeCoordinates={routeCoordinates}
          weatherData={weatherData}
        />
      </View>

      {/* Timeline Slider - Preview different departure times */}
      {routeCoordinates.length > 0 && (
        <View style={styles.sliderContainer}>
          {/* Departure Time, Estimated Arrival Time and Distance - Above Slider */}
          {routeDuration && (() => {
            // Calculate departure time (NOW + slider offset)
            const departureTime = new Date(Date.now() + selectedTime * 60 * 60 * 1000);
            const arrivalTime = new Date(departureTime.getTime() + routeDuration * 1000);
            
            // Format time helper
            const formatTime = (date) => {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const displayHours = hours % 12 || 12;
              const displayMinutes = minutes.toString().padStart(2, '0');
              return `${displayHours}:${displayMinutes} ${ampm}`;
            };
            
            // Format duration as hours and minutes
            const totalMinutes = Math.round(routeDuration / 60);
            const durationHours = Math.floor(totalMinutes / 60);
            const durationMinutes = totalMinutes % 60;
            const durationText = durationHours > 0 
              ? `${durationHours}h ${durationMinutes}m`
              : `${durationMinutes}m`;
            
            // Format distance in both miles and kilometers
            const miles = routeDistance ? (routeDistance / 1609.34).toFixed(1) : null;
            const kilometers = routeDistance ? (routeDistance / 1000).toFixed(1) : null;
            const distanceText = miles && kilometers 
              ? `${miles} mi / ${kilometers} km`
              : miles 
                ? `${miles} mi`
                : '';
            
            return (
              <View style={styles.arrivalInfo}>
                {/* Departure Time */}
                <View style={styles.timeRow}>
                  <Text style={styles.arrivalLabel}>Departure Time:</Text>
                  <Text style={styles.arrivalTime}>{formatTime(departureTime)}</Text>
                </View>
                
                {/* Estimated Arrival Time */}
                <View style={styles.timeRow}>
                  <Text style={styles.arrivalLabel}>Estimated Arrival:</Text>
                  <Text style={styles.arrivalTime}>{formatTime(arrivalTime)}</Text>
                </View>
                
                {/* Duration and Distance */}
                <Text style={styles.durationText}>
                  {durationText}
                  {distanceText ? ` • ${distanceText}` : ''}
                </Text>
              </View>
            );
          })()}
          <Text style={styles.sliderLabel}>
            Preview Weather: {selectedTime === 0 ? 'Current' : `+${selectedTime}h`} from departure
          </Text>
          <TimelineSlider
            value={selectedTime}
            onValueChange={handleTimeChange}
            maxHours={48}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'column',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    minWidth: 80,
  },
  checkboxContainer: {
    flex: 1,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 5,
  },
  currentLocationText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
    marginLeft: 88, // Align with input fields
  },
  searchButton: {
    marginTop: 5,
    alignSelf: 'stretch',
  },
  departureContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  arrivalInfo: {
    flexDirection: 'column',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  arrivalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    minWidth: 130,
  },
  arrivalTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  inputFullWidth: {
    flex: 0, // Override flex for full width inputs
    width: '100%',
    marginRight: 0,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  sliderContainer: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 20,
    textAlign: 'center',
  },
});

