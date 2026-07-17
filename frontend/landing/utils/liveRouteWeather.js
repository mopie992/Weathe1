/**
 * Live route + weather adapter for the landing page.
 * Reuses the same backend services as App.js and maps results into landing stop shape.
 */

import { getDirections } from '../../services/directionsService';
import { getWeather } from '../../services/weatherService';
import { geocode, reverseGeocode } from '../../services/geocodingService';
import { RISK, WEATHER_INTERVAL_MINUTES } from '../data/mockRoute';

const WEATHER_INTERVAL = WEATHER_INTERVAL_MINUTES || 30;

export function parseLatLon(input) {
  const match = String(input || '').trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (!match) return null;
  return {
    latitude: parseFloat(match[1]),
    longitude: parseFloat(match[2]),
  };
}

export async function resolveLocation(input, coordsHint = null) {
  if (coordsHint && Number.isFinite(coordsHint.latitude) && Number.isFinite(coordsHint.longitude)) {
    return {
      latitude: coordsHint.latitude,
      longitude: coordsHint.longitude,
      name: String(input || '').trim() || `${coordsHint.latitude.toFixed(4)}, ${coordsHint.longitude.toFixed(4)}`,
    };
  }

  const latLon = parseLatLon(input);
  if (latLon) {
    return { ...latLon, name: String(input).trim() };
  }

  const result = await geocode(String(input || '').trim());
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name || String(input).trim(),
  };
}

export function calculateWeatherPoints(routeCoordinates, routeDurationSeconds) {
  if (!routeCoordinates?.length || !routeDurationSeconds) {
    return { points: [], indices: [] };
  }

  const totalDurationMinutes = routeDurationSeconds / 60;
  const weatherPoints = [];
  const weatherIndices = [];
  const numPoints = routeCoordinates.length;
  const usedIndices = new Set();

  weatherPoints.push(routeCoordinates[0]);
  weatherIndices.push(0);
  usedIndices.add(0);

  let targetMinutes = WEATHER_INTERVAL;
  while (targetMinutes < totalDurationMinutes) {
    const progress = targetMinutes / totalDurationMinutes;
    const pointIndex = Math.min(Math.floor(progress * (numPoints - 1)), numPoints - 1);
    if (pointIndex > 0 && pointIndex < numPoints && !usedIndices.has(pointIndex)) {
      weatherPoints.push(routeCoordinates[pointIndex]);
      weatherIndices.push(pointIndex);
      usedIndices.add(pointIndex);
    }
    targetMinutes += WEATHER_INTERVAL;
  }

  const lastIndex = numPoints - 1;
  if (!usedIndices.has(lastIndex)) {
    weatherPoints.push(routeCoordinates[lastIndex]);
    weatherIndices.push(lastIndex);
  }

  return { points: weatherPoints, indices: weatherIndices };
}

export function calculateArrivalTimes(routeCoordinates, routeDurationSeconds, departureAt) {
  if (!routeCoordinates?.length || !routeDurationSeconds) return [];

  const departure = departureAt instanceof Date ? departureAt : new Date(departureAt || Date.now());
  const totalDurationMinutes = routeDurationSeconds / 60;
  const numPoints = routeCoordinates.length;
  const now = Date.now();

  return routeCoordinates.map((_, index) => {
    const progress = numPoints === 1 ? 0 : index / (numPoints - 1);
    const elapsedMinutes = progress * totalDurationMinutes;
    const arrivalTime = new Date(departure.getTime() + elapsedMinutes * 60 * 1000);
    return {
      pointIndex: index,
      arrivalTime,
      hoursFromNow: (arrivalTime.getTime() - now) / (1000 * 60 * 60),
      minutesFromNow: (arrivalTime.getTime() - now) / (1000 * 60),
      elapsedMinutesFromDeparture: elapsedMinutes,
      progress,
    };
  });
}

function pickForecast(hourlyForecasts, hoursFromNow, minutesFromNow) {
  if (!hourlyForecasts) return null;

  if (hoursFromNow <= 0 || minutesFromNow < 60) {
    return hourlyForecasts.current;
  }

  let intervalIndex = Math.floor((hoursFromNow - 3) / 3);
  intervalIndex = Math.max(0, intervalIndex);

  if (Array.isArray(hourlyForecasts.hourly) && hourlyForecasts.hourly.length > 0) {
    if (intervalIndex < hourlyForecasts.hourly.length) {
      return hourlyForecasts.hourly[intervalIndex];
    }
    return hourlyForecasts.hourly[hourlyForecasts.hourly.length - 1];
  }

  return hourlyForecasts.current;
}

function normalizeCondition(main, description) {
  const raw = `${main || ''} ${description || ''}`.toLowerCase();
  if (raw.includes('thunder')) return { condition: 'storms', conditionLabel: 'Thunderstorms' };
  if (raw.includes('drizzle')) return { condition: 'rain', conditionLabel: 'Drizzle' };
  if (raw.includes('rain')) return { condition: 'rain', conditionLabel: 'Rain' };
  if (raw.includes('snow') || raw.includes('sleet')) return { condition: 'snow', conditionLabel: 'Snow' };
  if (raw.includes('ice') || raw.includes('freezing')) return { condition: 'ice', conditionLabel: 'Icy Conditions' };
  if (raw.includes('fog') || raw.includes('mist') || raw.includes('haze')) {
    return { condition: 'fog', conditionLabel: 'Low Visibility' };
  }
  if (raw.includes('wind')) return { condition: 'wind', conditionLabel: 'Windy' };
  if (raw.includes('clear')) return { condition: 'clear', conditionLabel: 'Clear Skies' };
  if (raw.includes('cloud')) return { condition: 'cloudy', conditionLabel: 'Cloudy' };
  const label = description
    ? description.replace(/\b\w/g, (c) => c.toUpperCase())
    : main || 'Mixed Conditions';
  return { condition: (main || 'cloudy').toLowerCase(), conditionLabel: label };
}

function classifyRisk({ condition, windMph, precipIn, tempF }) {
  if (condition === 'ice' || condition === 'storms') {
    return { risk: RISK.SEVERE, warn: true };
  }
  if (condition === 'snow' || windMph >= 30 || precipIn >= 0.3) {
    return { risk: RISK.ELEVATED, warn: true };
  }
  if (condition === 'rain' || condition === 'fog' || condition === 'wind' || windMph >= 20 || precipIn >= 0.1) {
    return { risk: RISK.CAUTION, warn: true };
  }
  if (tempF <= 32 && (condition === 'rain' || precipIn > 0)) {
    return { risk: RISK.ELEVATED, warn: true };
  }
  return { risk: RISK.GOOD, warn: false };
}

function cToF(c) {
  return Math.round((Number(c) || 0) * (9 / 5) + 32);
}

function msToMph(ms) {
  return Math.round((Number(ms) || 0) * 2.23694);
}

function mmToIn(mm) {
  return Math.round(((Number(mm) || 0) / 25.4) * 100) / 100;
}

function formatTimeLabel(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function shortPlaceName(fullName) {
  if (!fullName) return 'Along route';
  const first = String(fullName).split(',')[0].trim();
  return first || String(fullName);
}

export function extractLiveWeatherItems({
  hourlyData,
  weatherPointIndices,
  arrivalTimes,
}) {
  if (!hourlyData?.length || !weatherPointIndices?.length) return [];

  return hourlyData
    .map((pointData, weatherIndex) => {
      const { lat, lon, hourlyForecasts } = pointData || {};
      if (!hourlyForecasts) return null;

      const routeIndex = weatherPointIndices[weatherIndex];
      if (routeIndex == null) return null;
      const arrivalInfo = arrivalTimes[routeIndex];
      if (!arrivalInfo) return null;

      const weather = pickForecast(
        hourlyForecasts,
        arrivalInfo.hoursFromNow,
        arrivalInfo.minutesFromNow
      );
      if (!weather?.weather) return null;

      return {
        lat,
        lon,
        routeIndex,
        arrivalTime: arrivalInfo.arrivalTime,
        hoursFromNow: arrivalInfo.hoursFromNow,
        elapsedMinutesFromDeparture: arrivalInfo.elapsedMinutesFromDeparture,
        weather: {
          temp: weather.temp ?? 20,
          feels_like: weather.feels_like ?? weather.temp ?? 20,
          precip: weather.precip?.['1h'] || 0,
          wind: weather.wind_speed || 0,
          humidity: weather.humidity || 50,
          condition: weather.weather.main || 'Clear',
          description: weather.weather.description || 'clear sky',
        },
      };
    })
    .filter(Boolean);
}

export function toLandingStops(liveItems, { originName, destinationName, placeNames = [] } = {}) {
  const last = liveItems.length - 1;
  return liveItems.map((item, index) => {
    const { condition, conditionLabel } = normalizeCondition(
      item.weather.condition,
      item.weather.description
    );
    const tempF = cToF(item.weather.temp);
    const feelsLikeF = cToF(item.weather.feels_like);
    const windMph = msToMph(item.weather.wind);
    const precipIn = mmToIn(item.weather.precip);
    const { risk, warn } = classifyRisk({ condition, windMph, precipIn, tempF });

    let name = placeNames[index] || 'Along route';
    if (index === 0 && originName) name = shortPlaceName(originName);
    if (index === last && destinationName) name = shortPlaceName(destinationName);

    return {
      id: `live-${index}-${item.lat.toFixed(3)}-${item.lon.toFixed(3)}`,
      name,
      region: '',
      lat: item.lat,
      lng: item.lon,
      timeLabel: formatTimeLabel(item.arrivalTime),
      tempF,
      feelsLikeF,
      humidity: Math.round(item.weather.humidity || 0),
      windMph,
      precipIn,
      condition,
      conditionLabel,
      risk,
      warn,
      arrivalTime: item.arrivalTime,
      hoursFromNow: item.hoursFromNow,
    };
  });
}

export function buildRiskSegments(stops) {
  if (!stops?.length) return [];

  const segments = [];
  let current = null;

  stops.forEach((stop, index) => {
    const hours = Number(stop.hoursFromNow);
    const hoursFrom = Number.isFinite(hours) ? Math.max(0, hours) : index * 0.5;
    const key = `${stop.risk}:${stop.condition}`;

    if (!current || current.key !== key) {
      if (current) {
        current.hoursTo = hoursFrom;
        current.flex = Math.max(0.5, current.hoursTo - current.hoursFrom);
        segments.push(current);
      }
      current = {
        id: `seg-${segments.length + 1}`,
        key,
        label: stop.conditionLabel || stop.condition,
        condition: stop.condition,
        risk: stop.risk,
        hoursFrom,
        hoursTo: hoursFrom,
        flex: 1,
      };
    } else {
      current.hoursTo = hoursFrom;
      current.label = stop.conditionLabel || current.label;
    }
  });

  if (current) {
    const lastHours = Number(stops[stops.length - 1]?.hoursFromNow);
    current.hoursTo = Number.isFinite(lastHours) ? Math.max(current.hoursFrom + 0.5, lastHours) : current.hoursFrom + 0.5;
    current.flex = Math.max(0.5, current.hoursTo - current.hoursFrom);
    segments.push(current);
  }

  return segments.map(({ key, ...rest }) => rest);
}

export function buildHourTicks(routeDurationSeconds, departureAt) {
  const durationHours = Math.max(1, Math.ceil((routeDurationSeconds || 0) / 3600));
  const end = Math.min(12, Math.max(2, durationHours));
  const ticks = [];
  for (let h = 0; h <= end; h += Math.max(1, Math.ceil(end / 4))) {
    ticks.push(h);
  }
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
  return ticks;
}

export function coordinatesToGeoJson(routeCoordinates) {
  const coordinates = (routeCoordinates || []).map((c) => [c.lon, c.lat]);
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

async function resolvePlaceNames(points, { originName, destinationName }) {
  const names = new Array(points.length).fill('Along route');
  if (!points.length) return names;
  names[0] = shortPlaceName(originName) || 'Start';
  names[points.length - 1] = shortPlaceName(destinationName) || 'Destination';

  const middle = points.slice(1, -1);
  const resolved = await Promise.all(
    middle.map(async (p) => {
      try {
        const name = await reverseGeocode(p.lat, p.lon);
        return shortPlaceName(name);
      } catch {
        return 'Along route';
      }
    })
  );
  resolved.forEach((name, i) => {
    names[i + 1] = name;
  });
  return names;
}

/**
 * Fetch a live route + weather payload once. Recompute stops locally when
 * departure / preview slider changes via `buildStopsFromLiveRoute`.
 */
export async function fetchLiveRouteWeather({
  origin,
  destination,
  originCoords = null,
  destinationCoords = null,
  departureAt = null,
}) {
  const [originLoc, destLoc] = await Promise.all([
    resolveLocation(origin, originCoords),
    resolveLocation(destination, destinationCoords),
  ]);

  const originParam = `${originLoc.longitude},${originLoc.latitude}`;
  const destParam = `${destLoc.longitude},${destLoc.latitude}`;
  const route = await getDirections(originParam, destParam);

  if (!route?.coordinates?.length) {
    throw new Error('No route found between those locations.');
  }

  const { points, indices } = calculateWeatherPoints(route.coordinates, route.duration);
  if (!points.length) {
    throw new Error('Could not sample weather points along the route.');
  }

  const hourlyData = await getWeather(points);
  const departure = departureAt instanceof Date ? departureAt : new Date();
  const placeNames = await resolvePlaceNames(points, {
    originName: originLoc.name,
    destinationName: destLoc.name,
  });

  return {
    originName: originLoc.name,
    destinationName: destLoc.name,
    routeCoordinates: route.coordinates,
    routeDuration: route.duration,
    routeDistance: route.distance,
    routeGeoJson: coordinatesToGeoJson(route.coordinates),
    weatherPoints: points,
    weatherPointIndices: indices,
    weatherHourlyData: hourlyData,
    placeNames,
    departureAt: departure,
  };
}

export function buildStopsFromLiveRoute(live, { departureAt, previewHours = 0 } = {}) {
  if (!live?.weatherHourlyData?.length) {
    return { stops: [], riskSegments: [], hourTicks: [0, 2, 4, 6] };
  }

  const baseDeparture = departureAt instanceof Date ? departureAt : live.departureAt || new Date();
  const effectiveDeparture = new Date(
    baseDeparture.getTime() + Math.max(0, Number(previewHours) || 0) * 60 * 60 * 1000
  );

  const arrivalTimes = calculateArrivalTimes(
    live.routeCoordinates,
    live.routeDuration,
    effectiveDeparture
  );
  const liveItems = extractLiveWeatherItems({
    hourlyData: live.weatherHourlyData,
    weatherPointIndices: live.weatherPointIndices,
    arrivalTimes,
  });
  const stops = toLandingStops(liveItems, {
    originName: live.originName,
    destinationName: live.destinationName,
    placeNames: live.placeNames,
  });

  return {
    stops,
    riskSegments: buildRiskSegments(stops),
    hourTicks: buildHourTicks(live.routeDuration, effectiveDeparture),
  };
}
