import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, Text } from 'react-native';

// Mapbox GL JS for web - load from CDN
const MAPBOX_TOKEN = 'pk.eyJ1Ijoia3BhcmtlcjcyIiwiYSI6ImNtams4OTZhaTBybTEzZm9wdmJzejlkbDQifQ.pnMrqfJ4qv6_n9fKb8eNfQ';

const MapViewWeb = ({ currentLocation, routeCoordinates, weatherData }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);
  const [mapboxgl, setMapboxgl] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Mapbox GL from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.mapboxgl) {
      setMapboxgl(window.mapboxgl);
      setLoading(false);
      return;
    }

    // Load CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.css';
      document.head.appendChild(link);
    }

    // Load JS script
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.js';
    script.async = true;
    script.onload = () => {
      if (window.mapboxgl) {
        setMapboxgl(window.mapboxgl);
        setLoading(false);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Mapbox GL from CDN');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapboxgl || !currentLocation || loading) return;

    if (!map.current && mapContainer.current) {
      mapboxgl.accessToken = MAPBOX_TOKEN;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 12
      });

      // Add current location marker
      new mapboxgl.Marker({ color: '#007AFF' })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [currentLocation, mapboxgl, loading]);

  // Update route line
  useEffect(() => {
    if (!map.current || !routeCoordinates || routeCoordinates.length === 0 || !mapboxgl) return;

    try {
      // Remove existing route source if it exists
      if (map.current.getSource('route')) {
        map.current.removeLayer('route');
        map.current.removeSource('route');
      }

      // Add route line - validate coordinates
      const coordinates = routeCoordinates
        .map(coord => {
          // Handle different coordinate formats (lat/lon, Lat/Lon, latitude/longitude)
          let lon, lat;
          
          if (coord.lon !== undefined && coord.lat !== undefined) {
            lon = typeof coord.lon === 'number' ? coord.lon : parseFloat(coord.lon);
            lat = typeof coord.lat === 'number' ? coord.lat : parseFloat(coord.lat);
          } else if (coord.Lon !== undefined && coord.Lat !== undefined) {
            lon = typeof coord.Lon === 'number' ? coord.Lon : parseFloat(coord.Lon);
            lat = typeof coord.Lat === 'number' ? coord.Lat : parseFloat(coord.Lat);
          } else if (coord.longitude !== undefined && coord.latitude !== undefined) {
            lon = typeof coord.longitude === 'number' ? coord.longitude : parseFloat(coord.longitude);
            lat = typeof coord.latitude === 'number' ? coord.latitude : parseFloat(coord.latitude);
          } else if (Array.isArray(coord) && coord.length >= 2) {
            // Handle [lat, lon] or [lon, lat] format
            lat = typeof coord[0] === 'number' ? coord[0] : parseFloat(coord[0]);
            lon = typeof coord[1] === 'number' ? coord[1] : parseFloat(coord[1]);
          } else {
            console.warn('Unknown coordinate format:', coord);
            return null;
          }
          
          // Fix coordinates that are 10x too large (common polyline decoding issue)
          if (Math.abs(lat) > 90) {
            lat = lat / 10;
          }
          if (Math.abs(lon) > 180) {
            lon = lon / 10;
          }
          
          // Validate range
          if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
            console.warn('Invalid coordinate after fix:', { lat, lon, original: coord });
            return null;
          }
          return [lon, lat];
        })
        .filter(coord => coord !== null); // Remove invalid coordinates
      
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#007AFF',
          'line-width': 4
        }
      });

      // Fit map to route bounds
      if (coordinates.length > 0 && mapboxgl) {
        try {
          // Validate coordinates first - filter out invalid ones
          const validCoords = coordinates.filter(coord => {
            const [lon, lat] = coord;
            return (
              typeof lon === 'number' && !isNaN(lon) && lon >= -180 && lon <= 180 &&
              typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90
            );
          });

          if (validCoords.length > 0) {
            const bounds = validCoords.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(validCoords[0], validCoords[0]));

            map.current.fitBounds(bounds, {
              padding: 50
            });
          }
        } catch (error) {
          console.error('Error fitting bounds:', error);
        }
      }
    } catch (error) {
      console.error('Error adding route:', error);
    }
  }, [routeCoordinates, mapboxgl]);

  // Update weather markers
  useEffect(() => {
    if (!map.current || !weatherData || weatherData.length === 0 || !mapboxgl) {
      console.log('Weather markers skipped:', {
        hasMap: !!map.current,
        hasWeatherData: !!weatherData,
        weatherDataLength: weatherData?.length || 0,
        hasMapboxgl: !!mapboxgl
      });
      return;
    }

    try {
      console.log('Adding weather markers for', weatherData.length, 'points');
      
      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add weather markers
      weatherData.forEach((item, index) => {
        if (!item || !item.weather) {
          console.warn('Invalid weather item at index', index, item);
          return;
        }

        const weather = item.weather;
        const color = getWeatherColor(weather);
        const icon = getWeatherIcon(weather.condition);

        // Get coordinates - handle different formats
        let lon, lat;
        if (item.lon !== undefined && item.lat !== undefined) {
          lon = typeof item.lon === 'number' ? item.lon : parseFloat(item.lon);
          lat = typeof item.lat === 'number' ? item.lat : parseFloat(item.lat);
        } else {
          console.warn('Missing coordinates in weather item:', item);
          return;
        }

        // Fix coordinates that are 10x too large
        if (Math.abs(lat) > 90) {
          lat = lat / 10;
        }
        if (Math.abs(lon) > 180) {
          lon = lon / 10;
        }

        // Validate coordinates
        if (isNaN(lon) || isNaN(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
          console.warn('Invalid coordinates for weather marker:', { lat, lon, original: item });
          return;
        }

        if (typeof document !== 'undefined') {
          const el = document.createElement('div');
          el.className = 'weather-marker';
          el.style.width = '50px';
          el.style.height = '50px';
          el.style.borderRadius = '25px';
          el.style.backgroundColor = color;
          el.style.border = '2px solid #fff';
          el.style.display = 'flex';
          el.style.flexDirection = 'column';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.fontSize = '16px';
          el.style.cursor = 'pointer';
          el.innerHTML = `
            <div>${icon}</div>
            <div style="font-size: 10px; font-weight: bold; margin-top: 2px;">${Math.round(weather.temp)}°</div>
          `;

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lon, lat])
            .addTo(map.current);

          markersRef.current.push(marker);
        }
      });

      console.log('Successfully added', markersRef.current.length, 'weather markers');
    } catch (error) {
      console.error('Error adding weather markers:', error);
    }
  }, [weatherData, mapboxgl]);

  if (typeof window === 'undefined') {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text>Not running in browser</Text>
        </View>
      </View>
    );
  }

  if (loading || !mapboxgl) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {React.createElement('div', { ref: mapContainer, style: styles.map })}
    </View>
  );
};

function getWeatherColor(weather) {
  const condition = weather.condition.toLowerCase();
  
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return 'rgba(59, 130, 246, 0.8)';
  } else if (condition.includes('snow')) {
    return 'rgba(255, 255, 255, 0.9)';
  } else if (condition.includes('storm') || condition.includes('thunder')) {
    return 'rgba(99, 102, 241, 0.8)';
  } else if (condition.includes('fog') || condition.includes('mist')) {
    return 'rgba(156, 163, 175, 0.8)';
  } else if (condition.includes('clear')) {
    return 'rgba(251, 191, 36, 0.8)';
  } else {
    return 'rgba(148, 163, 184, 0.8)';
  }
}

function getWeatherIcon(condition) {
  const cond = condition.toLowerCase();
  
  if (cond.includes('rain') || cond.includes('drizzle')) {
    return '🌧️';
  } else if (cond.includes('snow')) {
    return '❄️';
  } else if (cond.includes('storm') || cond.includes('thunder')) {
    return '⛈️';
  } else if (cond.includes('fog') || cond.includes('mist')) {
    return '🌫️';
  } else if (cond.includes('clear')) {
    return '☀️';
  } else if (cond.includes('cloud')) {
    return '☁️';
  } else {
    return '🌤️';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: '400px',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MapViewWeb;

