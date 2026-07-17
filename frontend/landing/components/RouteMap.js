import React, { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { ROUTE_GEOJSON, STOPS } from '../data/mockRoute';
import {
  createPinElement,
  createWarnElement,
  createWeatherMarkerElement,
} from './WeatherMarker';

function getMapboxToken() {
  if (Constants.expoConfig?.extra?.mapboxToken) return Constants.expoConfig.extra.mapboxToken;
  if (process.env.EXPO_PUBLIC_MAPBOX_TOKEN) return process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (typeof window !== 'undefined' && window.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return window.EXPO_PUBLIC_MAPBOX_TOKEN;
  }
  if (typeof window !== 'undefined' && window.__MAPBOX_TOKEN__) {
    return window.__MAPBOX_TOKEN__;
  }
  return '';
}

function loadMapbox() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Map requires a browser'));
      return;
    }
    if (window.mapboxgl) {
      resolve(window.mapboxgl);
      return;
    }

    if (!document.querySelector('link[data-rw-mapbox-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.css';
      link.setAttribute('data-rw-mapbox-css', 'true');
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-rw-mapbox-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.mapboxgl));
      existing.addEventListener('error', () => reject(new Error('Failed to load Mapbox')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.17.0/mapbox-gl.js';
    script.async = true;
    script.setAttribute('data-rw-mapbox-js', 'true');
    script.onload = () => resolve(window.mapboxgl);
    script.onerror = () => reject(new Error('Failed to load Mapbox'));
    document.head.appendChild(script);
  });
}

function clearMarkers(markersRef) {
  markersRef.current.forEach((m) => m.remove());
  markersRef.current = [];
}

function placeMarkers(map, mapboxgl, stops, temperatureUnit, onSelect, markersRef, routeGeoJson) {
  clearMarkers(markersRef);

  const coords = routeGeoJson?.geometry?.coordinates;
  const start = coords?.[0] || [stops[0].lng, stops[0].lat];
  const end = coords?.[coords.length - 1] || [stops[stops.length - 1].lng, stops[stops.length - 1].lat];

  markersRef.current.push(
    new mapboxgl.Marker({ element: createPinElement('start'), anchor: 'center' })
      .setLngLat(start)
      .addTo(map)
  );
  markersRef.current.push(
    new mapboxgl.Marker({ element: createPinElement('end'), anchor: 'center' })
      .setLngLat(end)
      .addTo(map)
  );

  stops.forEach((stop, index) => {
    const dense = stops.length > 6;
    // Alternate vertical offset so dense 30-min markers don't fully overlap
    const offsetY = dense
      ? index % 3 === 0
        ? -8
        : index % 3 === 1
          ? -18
          : -28
      : -10;
    const markerEl = createWeatherMarkerElement(stop, {
      temperatureUnit,
      onSelect,
    });
    markersRef.current.push(
      new mapboxgl.Marker({ element: markerEl, offset: [0, offsetY], anchor: 'bottom' })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map)
    );
  });
}

export default function RouteMap({
  routeGeoJson = ROUTE_GEOJSON,
  stops = STOPS,
  onMarkerSelect,
  temperatureUnit = 'F',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapboxRef = useRef(null);
  const markersRef = useRef([]);
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const [status, setStatus] = useState('Loading map…');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  // Init map once
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !containerRef.current) return;
        mapboxRef.current = mapboxgl;

        const token = getMapboxToken();
        if (!token || !token.startsWith('pk.')) {
          setStatus('Map unavailable — Mapbox token not configured.');
          return;
        }

        mapboxgl.accessToken = token;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [-85.2, 41.0],
          zoom: 5.4,
          attributionControl: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          if (cancelled) return;
          setStatus('');

          map.addSource('rw-route', {
            type: 'geojson',
            data: routeGeoJson,
          });

          map.addLayer({
            id: 'rw-route-line',
            type: 'line',
            source: 'rw-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#2774AE',
              'line-width': 4.5,
              'line-opacity': 0.95,
            },
          });

          const coords = routeGeoJson.geometry.coordinates;
          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          );
          map.fitBounds(bounds, {
            padding: { top: 56, bottom: 40, left: 40, right: 40 },
            maxZoom: 7.2,
            duration: 0,
          });

          setReady(true);
        });
      } catch (err) {
        if (!cancelled) setStatus(err.message || 'Unable to load map');
      }
    }

    init();

    return () => {
      cancelled = true;
      clearMarkers(markersRef);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setReady(false);
    };
    // Map init once; route geometry updates handled below if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when stops / unit change
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!ready || !map || !mapboxgl) return;

    const handleSelect = (stop) => {
      onMarkerSelectRef.current?.(stop);
    };

    placeMarkers(map, mapboxgl, stops, temperatureUnit, handleSelect, markersRef, routeGeoJson);
  }, [ready, stops, temperatureUnit, routeGeoJson]);

  // Keep route source in sync if geojson identity changes, and refit the view
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!ready || !map || !mapboxgl) return;
    const source = map.getSource('rw-route');
    if (source) source.setData(routeGeoJson);

    const coords = routeGeoJson?.geometry?.coordinates;
    if (coords && coords.length > 1) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, {
        padding: { top: 56, bottom: 40, left: 40, right: 40 },
        maxZoom: 8,
        duration: 600,
      });
    }
  }, [ready, routeGeoJson]);

  return (
    <div className="rw-map-shell" role="region" aria-label="Route weather map">
      <div ref={containerRef} className="rw-map-shell__canvas" />
      {status ? <div className="rw-map-shell__status">{status}</div> : null}
    </div>
  );
}
