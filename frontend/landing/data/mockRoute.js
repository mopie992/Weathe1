/**
 * Demo Columbus → Chicago route with correct geography.
 * Weather markers every 30 minutes of drive time (matches live app).
 * Replaceable later with live directions/weather API payloads.
 */

export const RISK = {
  GOOD: 'good',
  CAUTION: 'caution',
  ELEVATED: 'elevated',
  SEVERE: 'severe',
};

export const RISK_LABELS = {
  [RISK.GOOD]: 'Good',
  [RISK.CAUTION]: 'Use Caution',
  [RISK.ELEVATED]: 'Elevated Risk',
  [RISK.SEVERE]: 'Severe',
};

/** Live-app cadence */
export const WEATHER_INTERVAL_MINUTES = 30;

/** Intermediate points for a plausible NW then WNW highway path */
export const ROUTE_COORDINATES = [
  [-82.9988, 39.9612], // Columbus
  [-83.45, 40.35],
  [-83.95, 40.65],
  [-84.55, 40.9],
  [-85.1394, 41.0793], // Fort Wayne
  [-85.75, 41.25],
  [-86.35, 41.4],
  [-86.9, 41.52],
  [-87.3464, 41.5933], // Gary
  [-87.5, 41.72],
  [-87.6298, 41.8781], // Chicago
];

export const ROUTE_GEOJSON = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: ROUTE_COORDINATES,
  },
};

/** Total demo drive time (Columbus 8:00 → Chicago 1:25) */
export const ROUTE_DURATION_MINUTES = 5 * 60 + 25;
export const DEPARTURE_MINUTES = 8 * 60;

function haversineMeters(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLng = toR(b[0] - a[0]);
  const lat1 = toR(a[1]);
  const lat2 = toR(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildRouteDistanceTable(coords) {
  const seg = [0];
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    total += haversineMeters(coords[i - 1], coords[i]);
    seg.push(total);
  }
  return { seg, total };
}

function interpolateAlongRoute(coords, distanceTable, fraction) {
  const target = Math.max(0, Math.min(1, fraction)) * distanceTable.total;
  if (target <= 0) return { lng: coords[0][0], lat: coords[0][1] };
  if (target >= distanceTable.total) {
    const last = coords[coords.length - 1];
    return { lng: last[0], lat: last[1] };
  }
  for (let i = 1; i < coords.length; i += 1) {
    if (distanceTable.seg[i] >= target) {
      const span = distanceTable.seg[i] - distanceTable.seg[i - 1];
      const t = span === 0 ? 0 : (target - distanceTable.seg[i - 1]) / span;
      const a = coords[i - 1];
      const b = coords[i];
      return {
        lng: a[0] + (b[0] - a[0]) * t,
        lat: a[1] + (b[1] - a[1]) * t,
      };
    }
  }
  const last = coords[coords.length - 1];
  return { lng: last[0], lat: last[1] };
}

/**
 * Named places along the corridor, keyed by minutes from departure.
 * Intermediate points without a name get a short “Near …” label.
 */
const NAMED_PLACES = [
  { at: 0, id: 'columbus', name: 'Columbus', region: 'OH', major: true },
  { at: 60, id: 'lima', name: 'Lima', region: 'OH', major: false },
  { at: 150, id: 'fort-wayne', name: 'Fort Wayne', region: 'IN', major: true },
  { at: 210, id: 'plymouth', name: 'Plymouth', region: 'IN', major: false },
  { at: 270, id: 'gary', name: 'Gary', region: 'IN', major: true },
  { at: ROUTE_DURATION_MINUTES, id: 'chicago', name: 'Chicago', region: 'IL', major: true },
];

function placeForMinute(minute) {
  let best = NAMED_PLACES[0];
  let bestDist = Math.abs(minute - best.at);
  for (const place of NAMED_PLACES) {
    const d = Math.abs(minute - place.at);
    if (d < bestDist) {
      best = place;
      bestDist = d;
    }
  }
  // Snap to named place within 10 minutes; otherwise “Near …”
  if (bestDist <= 10) return { ...best, exact: true };
  const nearest = best;
  return {
    id: `near-${nearest.id}-${minute}`,
    name: `Near ${nearest.name}`,
    region: nearest.region,
    major: false,
    exact: false,
  };
}

function weatherForProgress(progress) {
  // Matches risk ribbon: clear → rain → wind → clear
  if (progress < 0.35) {
    return {
      condition: progress < 0.12 ? 'cloudy' : 'clear',
      conditionLabel: progress < 0.12 ? 'Cloudy' : 'Clear Skies',
      risk: RISK.GOOD,
      tempF: 68 - progress * 8,
      humidity: 55,
      windMph: 8,
      precipIn: 0,
    };
  }
  if (progress < 0.62) {
    return {
      condition: 'rain',
      conditionLabel: progress < 0.48 ? 'Light Rain' : 'Moderate Rain',
      risk: RISK.CAUTION,
      tempF: 62 - (progress - 0.35) * 20,
      humidity: 80,
      windMph: 14,
      precipIn: progress < 0.48 ? 0.08 : 0.18,
    };
  }
  if (progress < 0.88) {
    return {
      condition: 'wind',
      conditionLabel: 'Strong Crosswinds',
      risk: RISK.ELEVATED,
      tempF: 48 - (progress - 0.62) * 20,
      humidity: 55,
      windMph: 26,
      precipIn: 0,
    };
  }
  return {
    condition: 'clear',
    conditionLabel: 'Clear Skies',
    risk: RISK.GOOD,
    tempF: 68 + (progress - 0.82) * 25,
    humidity: 48,
    windMph: 10,
    precipIn: 0,
  };
}

function buildBaseStops() {
  const distanceTable = buildRouteDistanceTable(ROUTE_COORDINATES);
  const stops = [];
  const usedIds = new Set();

  for (
    let minute = 0;
    minute < ROUTE_DURATION_MINUTES;
    minute += WEATHER_INTERVAL_MINUTES
  ) {
    const progress = minute / ROUTE_DURATION_MINUTES;
    const { lng, lat } = interpolateAlongRoute(ROUTE_COORDINATES, distanceTable, progress);
    const place = placeForMinute(minute);
    const weather = weatherForProgress(progress);
    let id = place.exact ? place.id : `t${minute}`;
    if (usedIds.has(id)) id = `${id}-${minute}`;
    usedIds.add(id);

    const tempF = Math.round(weather.tempF);
    stops.push({
      id,
      name: place.name,
      region: place.region,
      major: place.major,
      lng,
      lat,
      minutesFromDeparture: minute,
      arrivalMinutes: DEPARTURE_MINUTES + minute,
      tempF,
      feelsLikeF: tempF - (weather.risk === RISK.ELEVATED ? 6 : 2),
      humidity: weather.humidity,
      windMph: weather.windMph,
      precipIn: weather.precipIn,
      condition: weather.condition,
      conditionLabel: weather.conditionLabel,
      risk: weather.risk,
      showMarkerDetail: true,
      warn: weather.risk === RISK.CAUTION || weather.risk === RISK.ELEVATED,
    });
  }

  // Always include destination
  const end = ROUTE_COORDINATES[ROUTE_COORDINATES.length - 1];
  const endWeather = weatherForProgress(1);
  const endTemp = Math.round(endWeather.tempF);
  if (stops[stops.length - 1]?.id !== 'chicago') {
    stops.push({
      id: 'chicago',
      name: 'Chicago',
      region: 'IL',
      major: true,
      lng: end[0],
      lat: end[1],
      minutesFromDeparture: ROUTE_DURATION_MINUTES,
      arrivalMinutes: DEPARTURE_MINUTES + ROUTE_DURATION_MINUTES,
      tempF: endTemp,
      feelsLikeF: endTemp,
      humidity: endWeather.humidity,
      windMph: endWeather.windMph,
      precipIn: endWeather.precipIn,
      condition: endWeather.condition,
      conditionLabel: endWeather.conditionLabel,
      risk: endWeather.risk,
      showMarkerDetail: true,
      warn: false,
    });
  }

  return stops;
}

/** Base stops at departure offset 0 — every 30 minutes */
export const STOPS = buildBaseStops();

function formatTimeLabel(totalMinutes) {
  const mins = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Derive stop weather for a departure-time offset (hours from "now").
 * Demo-only; live API will replace this.
 */
export function getStopsForDepartureOffset(hoursOffset = 0) {
  const offset = Math.max(0, Math.min(12, Math.round(hoursOffset)));
  return STOPS.map((stop, index) => {
    const tempDelta = Math.round(offset * (index % 2 === 0 ? 0.5 : -0.35));
    const windDelta = Math.floor(offset / 3);
    let { condition, conditionLabel, risk } = stop;

    if (risk === RISK.CAUTION && offset >= 8) {
      condition = 'cloudy';
      conditionLabel = 'Clearing';
      risk = RISK.GOOD;
    } else if (risk === RISK.ELEVATED && offset >= 5) {
      condition = 'wind';
      conditionLabel = 'Gusty Crosswinds';
      risk = RISK.ELEVATED;
    } else if (stop.id === 'chicago' && offset >= 9) {
      condition = 'cloudy';
      conditionLabel = 'Increasing Clouds';
      risk = RISK.GOOD;
    }

    const tempF = stop.tempF + tempDelta;
    return {
      ...stop,
      condition,
      conditionLabel,
      risk,
      tempF,
      feelsLikeF: tempF - (stop.tempF - stop.feelsLikeF),
      windMph: Math.max(0, stop.windMph + windDelta),
      timeLabel: formatTimeLabel(stop.arrivalMinutes + offset * 60),
      departureOffsetHours: offset,
      warn: risk === RISK.CAUTION || risk === RISK.ELEVATED || risk === RISK.SEVERE,
    };
  });
}

/** Major stops only — for denser forecast strip if needed */
export function getMajorStops(stops) {
  return stops.filter((s) => s.major);
}

export const RISK_SEGMENTS = [
  { id: 's1', label: 'Clear', condition: 'clear', risk: RISK.GOOD, flex: 2.5, hoursFrom: 0, hoursTo: 2.5 },
  { id: 's2', label: 'Rain', condition: 'rain', risk: RISK.CAUTION, flex: 2, hoursFrom: 2.5, hoursTo: 4.5 },
  { id: 's3', label: 'High Wind', condition: 'wind', risk: RISK.ELEVATED, flex: 1.5, hoursFrom: 4.5, hoursTo: 6 },
  { id: 's4', label: 'Clear', condition: 'clear', risk: RISK.GOOD, flex: 1.5, hoursFrom: 6, hoursTo: 7.5 },
];

export const HOUR_TICKS = [0, 2, 4, 6, 8];

export const FEATURES = [
  {
    id: 'timed',
    title: 'Weather timed to the journey',
    body: 'See conditions when you will actually arrive — not just what it looks like right now at the destination.',
    icon: 'clock',
  },
  {
    id: 'warning',
    title: 'Early warning of hazards',
    body: 'Spot rain, wind, ice, and storms along the corridor before you commit to a departure time.',
    icon: 'warning',
  },
  {
    id: 'compare',
    title: 'Departure-time comparison',
    body: 'Shift when you leave and compare how risk changes over the same stretch of road.',
    icon: 'calendar',
  },
];

export const AUDIENCES = [
  { id: 'commuters', label: 'Daily Commuters', icon: 'commute' },
  { id: 'roadtrip', label: 'Road Trippers', icon: 'roadtrip' },
  { id: 'rv', label: 'RV & Trailer Drivers', icon: 'rv' },
  { id: 'moto', label: 'Motorcyclists', icon: 'moto' },
  { id: 'fleet', label: 'Fleet & Delivery', icon: 'fleet' },
];

export const DEFAULT_PLANNER = {
  origin: 'Columbus, OH',
  destination: 'Chicago, IL',
  departure: 'depart-now',
};
