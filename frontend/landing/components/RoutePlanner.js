import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PLANNER } from '../data/mockRoute';
import { reverseGeocode } from '../../services/geocodingService';

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDayOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 3; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const label =
      i === 0
        ? `Today (${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})`
        : i === 1
          ? `Tomorrow (${d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })})`
          : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    options.push({ value: toDateInputValue(d), label, date: d });
  }
  return options;
}

function hoursFromNow(date) {
  return Math.max(0, (date.getTime() - Date.now()) / (1000 * 60 * 60));
}

export default function RoutePlanner({
  onSubmit,
  demoHint,
  temperatureUnit = 'F',
  onTemperatureUnitChange,
  onDepartureChange,
  loading = false,
  errorMessage = null,
}) {
  const [origin, setOrigin] = useState(DEFAULT_PLANNER.origin);
  const [destination, setDestination] = useState(DEFAULT_PLANNER.destination);
  const [departureMode, setDepartureMode] = useState('now'); // now | 1 | 2 | 3 | 4 | 5 | custom
  const dayOptions = useMemo(() => buildDayOptions(), []);
  const [customDate, setCustomDate] = useState(dayOptions[0].value);
  const [customTime, setCustomTime] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    return toTimeInputValue(d);
  });
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const [locating, setLocating] = useState(false);

  const resolvedDeparture = useMemo(() => {
    if (departureMode === 'now') {
      return { mode: 'now', label: 'Leave now', hoursFromNow: 0, at: new Date() };
    }
    if (departureMode !== 'custom') {
      const hours = Number(departureMode);
      const at = new Date(Date.now() + hours * 60 * 60 * 1000);
      return {
        mode: `in-${hours}h`,
        label: `In ${hours} hour${hours === 1 ? '' : 's'}`,
        hoursFromNow: hours,
        at,
      };
    }
    const [y, m, d] = customDate.split('-').map(Number);
    const [hh, mm] = customTime.split(':').map(Number);
    const at = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
    const hrs = hoursFromNow(at);
    return {
      mode: 'custom',
      label: at.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      hoursFromNow: Math.min(72, hrs),
      at,
    };
  }, [departureMode, customDate, customTime]);

  useEffect(() => {
    onDepartureChange?.(resolvedDeparture);
  }, [resolvedDeparture, onDepartureChange]);

  useEffect(() => {
    requestLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocation = async (silent = false) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (!silent) {
        setUseCurrentLocation(false);
        setLocationStatus('Location is not supported in this browser. Enter a starting point.');
      }
      return;
    }

    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        const city = await reverseGeocode(latitude, longitude);
        if (city) label = city;
      } catch {
        // keep coordinate label
      }

      setOrigin(label);
      setCurrentCoords({ latitude, longitude });
      setUseCurrentLocation(true);
      setLocationStatus(null);
    } catch (err) {
      setUseCurrentLocation(false);
      setCurrentCoords(null);
      if (!silent) {
        const denied = err && (err.code === 1 || /denied/i.test(String(err.message || '')));
        setLocationStatus(
          denied
            ? 'Location permission was denied. Enter a starting point, or allow location and try again.'
            : 'Could not get your location. Enter a starting point below.'
        );
      }
    } finally {
      setLocating(false);
    }
  };

  const handleUseCurrentToggle = async (checked) => {
    setUseCurrentLocation(checked);
    if (checked) {
      await requestLocation(false);
    } else {
      setCurrentCoords(null);
      setLocationStatus(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    if (!useCurrentLocation && !origin.trim()) {
      setLocationStatus('Please enter a starting point or use current location.');
      return;
    }
    if (!destination.trim()) {
      setLocationStatus('Please enter a destination.');
      return;
    }
    if (departureMode === 'custom' && resolvedDeparture.at.getTime() < Date.now() - 60 * 1000) {
      setLocationStatus('Please pick a departure time in the future (within the next 3 days).');
      return;
    }
    onSubmit?.({
      origin: origin.trim(),
      destination: destination.trim(),
      departure: resolvedDeparture,
      useCurrentLocation,
      originCoords: useCurrentLocation ? currentCoords : null,
      temperatureUnit,
    });
  };

  return (
    <form className="rw-planner" onSubmit={handleSubmit} noValidate>
      <div className="rw-planner__toolbar">
        <div className="rw-planner__tools">
          <label className="rw-check">
            <input
              type="checkbox"
              checked={useCurrentLocation}
              disabled={locating}
              onChange={(e) => handleUseCurrentToggle(e.target.checked)}
            />
            {locating ? 'Locating…' : 'Use current location'}
          </label>
        </div>

        <div className="rw-unit-toggle" role="group" aria-label="Temperature unit">
          <button
            type="button"
            aria-pressed={temperatureUnit === 'C'}
            onClick={() => onTemperatureUnitChange?.('C')}
          >
            °C
          </button>
          <button
            type="button"
            aria-pressed={temperatureUnit === 'F'}
            onClick={() => onTemperatureUnitChange?.('F')}
          >
            °F
          </button>
        </div>
      </div>

      <div className="rw-planner__row">
        <div className="rw-field">
          <label htmlFor="rw-origin">Starting point</label>
          <input
            id="rw-origin"
            name="origin"
            type="text"
            autoComplete="address-line1"
            placeholder="City or address"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              if (useCurrentLocation) setUseCurrentLocation(false);
              if (currentCoords) setCurrentCoords(null);
              if (locationStatus) setLocationStatus(null);
            }}
            disabled={useCurrentLocation && locating}
            required={!useCurrentLocation}
          />
        </div>

        <div className="rw-field">
          <label htmlFor="rw-destination">Destination</label>
          <input
            id="rw-destination"
            name="destination"
            type="text"
            autoComplete="address-line1"
            placeholder="City or address"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (locationStatus) setLocationStatus(null);
            }}
            required
          />
        </div>

        <div className="rw-field">
          <label htmlFor="rw-departure">Departure</label>
          <select
            id="rw-departure"
            name="departure"
            value={departureMode}
            onChange={(e) => {
              setDepartureMode(e.target.value);
              if (locationStatus) setLocationStatus(null);
            }}
          >
            <option value="now">Leave now</option>
            <option value="1">In 1 hour</option>
            <option value="2">In 2 hours</option>
            <option value="3">In 3 hours</option>
            <option value="4">In 4 hours</option>
            <option value="5">In 5 hours</option>
            <option value="custom">Pick date &amp; time…</option>
          </select>
        </div>

        <button
          type="submit"
          className="rw-btn rw-btn--primary rw-planner__submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Checking…' : 'Check My Route'}
        </button>
      </div>

      {departureMode === 'custom' ? (
        <div className="rw-planner__custom-time" role="group" aria-label="Custom departure date and time">
          <div className="rw-field">
            <label htmlFor="rw-depart-date">Date</label>
            <select
              id="rw-depart-date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            >
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rw-field">
            <label htmlFor="rw-depart-time">Time</label>
            <input
              id="rw-depart-time"
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              required
            />
          </div>
          <p className="rw-planner__hint">Within the next 3 days · selected: {resolvedDeparture.label}</p>
        </div>
      ) : null}

      {locationStatus ? <p className="rw-planner__status" role="status">{locationStatus}</p> : null}
      {errorMessage ? <p className="rw-planner__status rw-planner__status--error" role="alert">{errorMessage}</p> : null}
      {demoHint ? <p className="rw-planner__hint">{demoHint}</p> : null}
    </form>
  );
}
