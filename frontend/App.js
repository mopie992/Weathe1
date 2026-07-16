import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
// Use web map for web, placeholder for mobile
const MapViewComponent = Platform.OS === 'web'
  ? require('./components/MapViewWeb').default
  : require('./components/MapViewPlaceholder').default;
import TimelineSlider from './components/TimelineSlider';
import WelcomeModal from './components/WelcomeModal';
import DateTimePickerModal from './components/DateTimePickerModal';
import WeatherDetailModal from './components/WeatherDetailModal';
import HamburgerMenu from './components/HamburgerMenu';
import { getDirections } from './services/directionsService';
import { getWeather } from './services/weatherService';
import { geocode, reverseGeocode } from './services/geocodingService';
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
  const [selectedTime, setSelectedTime] = useState(0); // Hours from departure time (for slider preview)
  const [departureTime, setDepartureTime] = useState(null); // Custom departure time (null = now)
  const [showDateTimePicker, setShowDateTimePicker] = useState(false); // Show/hide date time picker modal
  const [temperatureUnit, setTemperatureUnit] = useState('C'); // Temperature unit: 'C' or 'F'
  const [selectedWeatherData, setSelectedWeatherData] = useState(null); // Selected weather data for detail modal
  const [showWeatherDetail, setShowWeatherDetail] = useState(false); // Show/hide weather detail modal
  const [showListView, setShowListView] = useState(false); // Show/hide list view
  const [departureCity, setDepartureCity] = useState(null); // Departure city name
  const [destinationCity, setDestinationCity] = useState(null); // Destination city name
  const [currentLocationCity, setCurrentLocationCity] = useState(null); // Current location city name
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null); // Soft status under departure controls

  // Web-friendly alerts: RN Alert.alert is often invisible in browsers
  const showAlert = (title, message) => {
    const text = message ? `${title}\n\n${message}` : title;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(text);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleLocationUnavailable = (message, { silent = false } = {}) => {
    setCurrentLocation(null);
    setUseCurrentLocation(false);
    setLocationStatus(message || 'Location unavailable. Enter a departure address below.');
    if (!silent) {
      showAlert('Location Unavailable', message || 'Please enter your departure location manually.');
    }
  };

  // Try to get location automatically on load
  useEffect(() => {
    // Silently try to get location on page load
    requestLocationPermission(true); // true = silent mode (no alerts on failure)
  }, []);

  // Reverse geocode current location to get city name
  useEffect(() => {
    if (currentLocation && useCurrentLocation) {
      reverseGeocode(currentLocation.latitude, currentLocation.longitude)
        .then(cityName => {
          if (cityName) {
            setCurrentLocationCity(cityName);
          } else {
            setCurrentLocationCity(`Approximate: ${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)}`);
          }
        })
        .catch(error => {
          console.error('Error reverse geocoding current location:', error);
          setCurrentLocationCity(`Approximate: ${currentLocation.latitude.toFixed(2)}, ${currentLocation.longitude.toFixed(2)}`);
        });
    } else {
      setCurrentLocationCity(null);
    }
  }, [currentLocation, useCurrentLocation]);

  const requestLocationPermission = async (silent = false) => {
    try {
      setLocationStatus(silent ? 'Detecting location...' : null);

      // For web, use browser's native geolocation API
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          handleLocationUnavailable('Geolocation is not supported by this browser.', { silent });
          return;
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
                setUseCurrentLocation(true);
                setLocationStatus(null);
                resolve(coords);
              },
              async (error) => {
                // Only log errors in non-silent mode to reduce console noise
                if (!silent) {
                  console.error('❌ Location error (web):', error);
                }
                let errorMessage = 'Could not get your location.';
                let shouldTryIPFallback = false;

                if (error.code === 1) {
                  errorMessage = 'Location permission was denied. Please allow location access in your browser settings.';
                } else if (error.code === 2) {
                  // For laptops/desktops, try IP-based geolocation as fallback
                  shouldTryIPFallback = true;
                  errorMessage = 'Precise location unavailable (laptops don\'t have GPS). Trying approximate location...';
                } else if (error.code === 3) {
                  // Timeout - also try IP fallback since laptops often timeout
                  shouldTryIPFallback = true;
                  errorMessage = 'Location request timed out. Trying approximate location...';
                }

                // Try IP-based geolocation as fallback for code 2 (position unavailable) or code 3 (timeout)
                if (shouldTryIPFallback) {
                  try {
                    setLocationStatus('Trying approximate location...');
                    const ipResponse = await fetch('https://ipapi.co/json/');
                    const ipData = await ipResponse.json();

                    if (ipData.latitude && ipData.longitude) {
                      const coords = {
                        latitude: ipData.latitude,
                        longitude: ipData.longitude
                      };
                      setCurrentLocation(coords);
                      setUseCurrentLocation(true);
                      setLocationStatus(null);
                      if (!silent) {
                        showAlert(
                          'Approximate Location',
                          `Using approximate location based on your IP address (${ipData.city || 'unknown'}, ${ipData.country_name || 'unknown'}). This may not be exact.`
                        );
                      }
                      resolve(coords);
                      return;
                    }
                  } catch (ipError) {
                    // Only log IP fallback errors in non-silent mode
                    if (!silent) {
                      console.error('IP geolocation also failed:', ipError);
                    }
                  }
                }

                // Location failed — always fall back to manual departure entry
                handleLocationUnavailable(
                  errorMessage + (shouldTryIPFallback ? '\n\nPlease enter your departure location manually.' : ''),
                  { silent }
                );
                reject(error);
              },
              {
                enableHighAccuracy: false,
                timeout: 15000, // Reduced timeout to fail faster and use IP fallback
                maximumAge: 60000
              }
            );
          });
        } catch (error) {
          // Error already handled in the callback, but only log in non-silent mode
          if (!silent) {
            console.error('Geolocation promise rejected:', error);
          }
          // Don't re-throw in silent mode to prevent unhandled rejection warnings
          if (!silent) {
            throw error;
          }
        }
        return; // Exit early for web
      }

      // For mobile (iOS/Android), use Expo Location API
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        handleLocationUnavailable(
          'Location permission was denied. Please enter your departure location manually.',
          { silent }
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000
      });

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      setCurrentLocation(coords);
      setUseCurrentLocation(true);
      setLocationStatus(null);
    } catch (error) {
      // Only log errors in non-silent mode to reduce console noise
      if (!silent) {
        console.error('❌ Location error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          name: error.name
        });
      }
      handleLocationUnavailable(
        `Could not get your location: ${error.message}. Please enter your departure location manually.`,
        { silent }
      );
    }
  };

  const handleSearchRoute = async () => {
    // Validate required fields
    if (!destination.trim()) {
      showAlert('Error', 'Please enter a destination');
      return;
    }

    if (!useCurrentLocation && !departure.trim()) {
      showAlert('Error', 'Please enter a departure location or use current location');
      return;
    }

    if (useCurrentLocation && !currentLocation) {
      handleLocationUnavailable(
        'Current location is not available. Enter a departure address, or re-enable Use Current Location after allowing browser location access.'
      );
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

      // Fetch city names for departure and destination
      try {
        const [depCity, destCity] = await Promise.all([
          reverseGeocode(originCoords.latitude, originCoords.longitude),
          reverseGeocode(destCoords.latitude, destCoords.longitude)
        ]);
        setDepartureCity(depCity);
        setDestinationCity(destCity);
      } catch (error) {
        console.error('Error fetching city names:', error);
        // Set fallback names
        setDepartureCity(`Approximate: ${originCoords.latitude.toFixed(2)}, ${originCoords.longitude.toFixed(2)}`);
        setDestinationCity(`Approximate: ${destCoords.latitude.toFixed(2)}, ${destCoords.longitude.toFixed(2)}`);
      }

      // CRITICAL: Only fetch weather for points we'll actually display (every 30 minutes)
      // This dramatically reduces API calls for long trips
      const { points: calculatedWeatherPoints, indices: calculatedWeatherIndices } = calculateWeatherPoints(route.coordinates, route.duration);
      setWeatherPoints(calculatedWeatherPoints); // Store which points we fetched weather for
      setWeatherPointIndices(calculatedWeatherIndices); // Store route indices for each weather point

      // IMPORTANT: Fetch weather ONCE for all hours (0-36 hours) - this is the ONLY API call
      // The slider will later switch between this cached data without making new API calls
      const weatherPromise = getWeather(calculatedWeatherPoints);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Weather request timed out after 30 seconds')), 30000)
      );

      try {
        const weatherHourly = await Promise.race([weatherPromise, timeoutPromise]);

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
        showAlert(
          'Weather Unavailable',
          'Route loaded successfully, but weather data could not be fetched. The route is still visible on the map.'
        );
      }
    } catch (error) {
      console.error('Route search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch route or weather data';
      showAlert('Error', errorMessage);
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

    // Use custom departure time if set, otherwise use now + offset
    const baseDepartureTime = departureTime || new Date();
    const actualDepartureTime = new Date(baseDepartureTime.getTime() + departureOffsetMinutes * 60 * 1000);
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
      const arrivalTime = new Date(actualDepartureTime.getTime() + elapsedMinutes * 60 * 1000);
      // Calculate hours from NOW (not from departure) for weather lookup
      const hoursFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const minutesFromNow = (arrivalTime.getTime() - Date.now()) / (1000 * 60);


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
        } else if (minutesFromNow < 60) {
          // Less than 1 hour away - use current weather (closest we have)
          weather = hourlyForecasts.current;
        } else {
          // More than 1 hour away - map to 3-hour interval index
          // OpenWeather forecast returns data in 3-hour intervals (limited to 36 hours / 12 items)
          // The first forecast item (index 0) is typically 3 hours from now
          // So: 0-3h = current, 3-6h = index 0, 6-9h = index 1, 9-12h = index 2, etc.
          // Formula: intervalIndex = floor((hoursFromNow - 3) / 3), clamped to valid range
          let intervalIndex = Math.floor((hoursFromNow - 3) / 3);
          intervalIndex = Math.max(0, intervalIndex); // Don't allow negative


          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];

            } else {
              // Beyond forecast range, use last available
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
            }
          } else {
            // No hourly data, use current
            weather = hourlyForecasts.current;
            console.error(`❌ Point ${weatherIndex}: No hourly data!`, {
              hasHourly: !!hourlyForecasts.hourly,
              hourlyType: typeof hourlyForecasts.hourly,
              hourlyIsArray: Array.isArray(hourlyForecasts.hourly),
              hourlyLength: hourlyForecasts.hourly?.length || 0,
              hasCurrent: !!hourlyForecasts.current,
              location: `${lat.toFixed(4)},${lon.toFixed(4)}`
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

        let weather;

        if (hoursFromNow === 0) {
          // Current weather
          weather = hourlyForecasts.current;
        } else if (hoursFromNow > 0) {
          // OpenWeather forecast gives 3-hour intervals (not true hourly, limited to 36 hours)
          // Map slider hours to 3-hour interval index
          // Hour 1-3 = index 0, Hour 4-6 = index 1, etc.
          // intervalIndex = 0 for hours 1-3, 1 for hours 4-6, 2 for hours 7-9, etc.
          const intervalIndex = Math.floor((hoursFromNow - 1) / 3);

          // Check if hourly array exists and has data
          if (hourlyForecasts.hourly && Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
            if (intervalIndex < hourlyForecasts.hourly.length) {
              weather = hourlyForecasts.hourly[intervalIndex];
            } else {
              // If beyond available forecast, use the last available forecast
              weather = hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
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
    updateWeatherForDepartureTime(0, hours); // departureOffsetMinutes is 0, previewHoursOffset is from slider
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
      } else {
        // For intermediate points, check if they're at reasonable intervals
        // Since we already calculated them at 30-min intervals, include them all
        filtered.push(weatherItem);
      }
    });

    return filtered;
  };

  // Track last departure time we fetched weather for
  const lastWeatherFetchTimeRef = useRef(null);

  // Re-fetch weather when departure time changes significantly (if route already exists)
  useEffect(() => {
    // Only re-fetch if we have a route and weather points already calculated
    if (routeCoordinates.length > 0 && weatherPoints.length > 0 && routeDuration && departureTime) {
      const now = new Date();
      const timeDiffHours = Math.abs((departureTime.getTime() - now.getTime()) / (1000 * 60 * 60));
      const isDifferentDay = departureTime.toDateString() !== now.toDateString();

      // Check if departure time changed significantly from last fetch
      const departureTimeChanged = lastWeatherFetchTimeRef.current
        ? Math.abs(departureTime.getTime() - lastWeatherFetchTimeRef.current.getTime()) > 6 * 60 * 60 * 1000 // 6 hours in ms
        : true; // First time setting departure time

      // Re-fetch if:
      // 1. Departure time is more than 6 hours from now (future/past), OR
      // 2. It's a different day, AND
      // 3. The departure time actually changed from the last fetch
      if ((timeDiffHours > 6 || isDifferentDay) && departureTimeChanged) {
        // Update ref to prevent duplicate fetches
        lastWeatherFetchTimeRef.current = departureTime;

        // Re-fetch weather for the new departure time
        const fetchWeatherForNewDepartureTime = async () => {
          try {
            setLoading(true);
            const weatherPromise = getWeather(weatherPoints, true); // true = clearCache
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Weather request timed out after 30 seconds')), 30000)
            );

            const weatherHourly = await Promise.race([weatherPromise, timeoutPromise]);

            if (weatherHourly && weatherHourly.length > 0) {
              setWeatherHourlyData(weatherHourly);
              // Update displayed weather with new data
              updateWeatherForDepartureTime(0, selectedTime);
            }
          } catch (error) {
            console.error('Error re-fetching weather for new departure time:', error);
            setError(`Failed to update weather: ${error.message}`);
          } finally {
            setLoading(false);
          }
        };

        fetchWeatherForNewDepartureTime();
      } else {
        // Small time change or no change - just update display from cached data
        if (!lastWeatherFetchTimeRef.current) {
          lastWeatherFetchTimeRef.current = departureTime;
        }
        updateWeatherForDepartureTime(0, selectedTime);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departureTime]);

  // Update weather when route, preview slider, or departure time changes
  useEffect(() => {
    if (weatherHourlyData.length > 0 && routeDuration && routeCoordinates.length > 0) {
      updateWeatherForDepartureTime(0, selectedTime);
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

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        visible={showDateTimePicker}
        onClose={() => setShowDateTimePicker(false)}
        onApply={(selectedDate) => {
          // Check if departure time is more than 3 days in the future
          const now = new Date();
          const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

          if (selectedDate > threeDaysFromNow) {
            showAlert(
              'Weather Forecast Notice',
              'Please note weather predictions more than a few days ahead may be incorrect.'
            );
            setDepartureTime(selectedDate);
            setShowDateTimePicker(false);
          } else {
            setDepartureTime(selectedDate);
            setShowDateTimePicker(false);
          }
        }}
        initialDate={departureTime || new Date()}
      />

      {/* Weather Detail Modal */}
      <WeatherDetailModal
        visible={showWeatherDetail}
        onClose={() => {
          setShowWeatherDetail(false);
          setSelectedWeatherData(null);
        }}
        weatherData={selectedWeatherData}
        temperatureUnit={temperatureUnit}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchContainerColumns}>
          {/* Column 1: Hamburger Menu and C/F Toggle */}
          <View style={styles.searchColumnMenu}>
            <HamburgerMenu
              temperatureUnit={temperatureUnit}
              setTemperatureUnit={setTemperatureUnit}
            />
          </View>

          {/* Column 2: Departure, Destination, Time, Search */}
          <View style={styles.searchColumnLeft}>
            {/* Departure Location */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Departure:</Text>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={async () => {
                    const newValue = !useCurrentLocation;
                    setUseCurrentLocation(newValue);
                    setLocationStatus(null);

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
                onChangeText={(text) => {
                  setDeparture(text);
                  if (locationStatus) setLocationStatus(null);
                }}
              />
            )}
            {useCurrentLocation && currentLocation && (
              <Text style={styles.currentLocationText}>
                Current: {currentLocationCity || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
              </Text>
            )}
            {useCurrentLocation && !currentLocation && locationStatus && (
              <Text style={styles.locationStatusText}>{locationStatus}</Text>
            )}
            {!useCurrentLocation && locationStatus && (
              <Text style={styles.locationStatusText}>{locationStatus}</Text>
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

            {/* Departure Time */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Departure Time:</Text>
            </View>
            <View style={styles.departureTimeContainer}>
              <TouchableOpacity
                style={{ flex: 1, marginRight: departureTime ? 10 : 0 }}
                onPress={() => setShowDateTimePicker(true)}
                activeOpacity={0.7}
              >
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 0 }]}
                  placeholder="Click to set time"
                  value={departureTime ? departureTime.toLocaleString() : `Now (${new Date().toLocaleString()}) - click to set time`}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              {departureTime && (
                <TouchableOpacity
                  style={[styles.button, { minWidth: 100, backgroundColor: '#dc3545' }]}
                  onPress={() => setDepartureTime(null)}
                >
                  <Text style={styles.buttonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search Button */}
            <TouchableOpacity
              style={[styles.button, styles.searchButton]}
              onPress={handleSearchRoute}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Search Route'}</Text>
            </TouchableOpacity>
          </View>

          {/* Right Column: List View */}
          <View style={styles.searchColumnRight}>
            {/* List View Toggle Button */}
            {routeCoordinates.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.listViewButton,
                  showListView && styles.listViewButtonActive
                ]}
                onPress={() => setShowListView(!showListView)}
              >
                <Text style={[
                  styles.listViewButtonText,
                  showListView && styles.listViewButtonTextActive
                ]}>
                  {showListView ? 'Hide List' : 'List View'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* List View or Map View */}
      {showListView ? (
        <View style={styles.listViewContainer}>
          <View style={styles.listViewHeader}>
            <Text style={styles.listViewTitle}>Weather Along Route</Text>
            {departureCity && destinationCity && (
              <View style={styles.listViewRouteInfo}>
                <Text style={styles.listViewRouteText}>
                  <Text style={styles.listViewRouteLabel}>From: </Text>
                  {departureCity}
                </Text>
                <Text style={styles.listViewRouteText}>
                  <Text style={styles.listViewRouteLabel}>To: </Text>
                  {destinationCity}
                </Text>
              </View>
            )}
            <Text style={styles.listViewSubtitle}>
              {weatherData.length} weather points from departure to arrival
            </Text>
          </View>
          <ScrollView style={styles.listViewContent}>
            {weatherData.length > 0 ? (
              weatherData
                .slice()
                .sort((a, b) => {
                  // Sort by arrival time
                  const timeA = a.arrivalTime ? new Date(a.arrivalTime).getTime() : 0;
                  const timeB = b.arrivalTime ? new Date(b.arrivalTime).getTime() : 0;
                  return timeA - timeB;
                })
                .map((item, index) => {
                  const weather = item.weather;
                  const convertTemp = (tempC) => {
                    if (temperatureUnit === 'F') {
                      return Math.round((tempC * 9/5) + 32);
                    }
                    return Math.round(tempC);
                  };

                  const formatTime = (arrivalTime) => {
                    if (!arrivalTime) return 'N/A';
                    const time = new Date(arrivalTime);
                    return time.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                  };

                  const getWeatherIcon = (condition) => {
                    const icons = {
                      'Clear': '☀️',
                      'Clouds': '☁️',
                      'Rain': '🌧️',
                      'Drizzle': '🌦️',
                      'Thunderstorm': '⛈️',
                      'Snow': '❄️',
                      'Mist': '🌫️',
                      'Fog': '🌫️',
                      'Haze': '🌫️',
                    };
                    return icons[condition] || '🌤️';
                  };

                  const weatherCondition = weather.weather?.main || weather.condition || 'Unknown';
                  const weatherDescription = weather.weather?.description || weatherCondition;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.listViewItem}
                      onPress={() => {
                        setSelectedWeatherData(item);
                        setShowWeatherDetail(true);
                      }}
                    >
                      <View style={styles.listViewItemContent}>
                        <View style={styles.listViewItemLeft}>
                          <Text style={styles.listViewItemIcon}>
                            {getWeatherIcon(weatherCondition)}
                          </Text>
                          <View style={styles.listViewItemTextContainer}>
                            <Text style={styles.listViewItemTime}>
                              {formatTime(item.arrivalTime)}
                            </Text>
                            <Text style={styles.listViewItemWeather}>
                              {weatherDescription.charAt(0).toUpperCase() + weatherDescription.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.listViewItemRight}>
                          <Text style={styles.listViewItemTemp}>
                            {convertTemp(weather.temp)}°{temperatureUnit}
                          </Text>
                          <Text style={styles.listViewItemArrow}>›</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
            ) : (
              <View style={styles.listViewEmpty}>
                <Text style={styles.listViewEmptyText}>
                  No weather data available. Search for a route to see weather information.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapViewComponent
            currentLocation={currentLocation}
            routeCoordinates={routeCoordinates}
            weatherData={weatherData}
            temperatureUnit={temperatureUnit}
            onMarkerClick={(weatherItem) => {
              setSelectedWeatherData(weatherItem);
              setShowWeatherDetail(true);
            }}
          />
        </View>
      )}

      {/* Timeline Slider - Preview different departure times */}
      {routeCoordinates.length > 0 && (
        <View style={styles.sliderContainer}>
          {/* Departure Time, Estimated Arrival Time and Distance - Above Slider */}
          {routeDuration && (() => {
            // Calculate departure time (custom departure time or NOW + slider offset)
            const baseDeparture = departureTime || new Date();
            const actualDepartureTime = new Date(baseDeparture.getTime() + selectedTime * 60 * 60 * 1000);
            const arrivalTime = new Date(actualDepartureTime.getTime() + routeDuration * 1000);

            // Format time helper
            const formatTime = (date, showDateIfFuture = false) => {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const displayHours = hours % 12 || 12;
              const displayMinutes = minutes.toString().padStart(2, '0');
              const timeString = `${displayHours}:${displayMinutes} ${ampm}`;

              // If showDateIfFuture is true and date is in the future, add date
              if (showDateIfFuture) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dateOnly = new Date(date);
                dateOnly.setHours(0, 0, 0, 0);

                if (dateOnly > today) {
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  const year = date.getFullYear();
                  return `${timeString} (${month}/${day}/${year})`;
                }
              }

              return timeString;
            };

            // Format date helper for arrival time
            const formatTimeWithDateIfDifferentDay = (date) => {
              const hours = date.getHours();
              const minutes = date.getMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const displayHours = hours % 12 || 12;
              const displayMinutes = minutes.toString().padStart(2, '0');
              const timeString = `${displayHours}:${displayMinutes} ${ampm}`;

              // Check if date is different from today
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dateOnly = new Date(date);
              dateOnly.setHours(0, 0, 0, 0);

              if (dateOnly.getTime() !== today.getTime()) {
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const year = date.getFullYear();
                return `${timeString} (${month}/${day}/${year})`;
              }

              return timeString;
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
                  <Text style={styles.arrivalTime}>{formatTime(actualDepartureTime, true)}</Text>
                </View>

                {/* Estimated Arrival Time */}
                <View style={styles.timeRow}>
                  <Text style={styles.arrivalLabel}>Estimated Arrival:</Text>
                  <Text style={styles.arrivalTime}>{formatTimeWithDateIfDifferentDay(arrivalTime)}</Text>
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
            Use Slider to preview weather for different departure times for the next 12h
          </Text>
          <TimelineSlider
            value={selectedTime}
            onValueChange={handleTimeChange}
            maxHours={12}
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
  searchContainerColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  searchColumnMenu: {
    width: 48,
    alignItems: 'flex-start',
  },
  searchColumnLeft: {
    flex: 1,
    minWidth: 0, // Allow flex to shrink
  },
  searchColumnRight: {
    width: 140,
    alignItems: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
    marginBottom: 6,
    marginLeft: 88, // Align with input fields
  },
  locationStatusText: {
    fontSize: 12,
    color: '#b45309',
    marginBottom: 6,
    marginLeft: 88,
  },
  searchButton: {
    marginTop: 4,
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
  departureTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: -5,
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  tempUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
    width: '100%',
    justifyContent: 'center',
  },
  tempUnitButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  tempUnitButtonActive: {
    backgroundColor: '#1976d2',
  },
  tempUnitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tempUnitTextActive: {
    color: '#fff',
  },
  listViewButton: {
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    width: '100%',
    alignItems: 'center',
  },
  listViewButtonActive: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  listViewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  listViewButtonTextActive: {
    color: '#fff',
  },
  listViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listViewHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  listViewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  listViewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  listViewRouteInfo: {
    marginTop: 8,
    marginBottom: 4,
  },
  listViewRouteText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  listViewRouteLabel: {
    fontWeight: '600',
    color: '#1976d2',
  },
  listViewContent: {
    flex: 1,
  },
  listViewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  listViewItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  listViewItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listViewItemIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  listViewItemTextContainer: {
    flex: 1,
  },
  listViewItemTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listViewItemWeather: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  listViewItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listViewItemTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginRight: 8,
  },
  listViewItemArrow: {
    fontSize: 24,
    color: '#999',
  },
  listViewEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  listViewEmptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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

