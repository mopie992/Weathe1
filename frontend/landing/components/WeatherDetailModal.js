import React from 'react';
import ModalShell from './ModalShell';
import { RISK_LABELS } from '../data/mockRoute';
import { WeatherIcon } from './Icons';

function displayTemp(tempF, unit) {
  if (unit === 'C') return Math.round(((tempF - 32) * 5) / 9);
  return tempF;
}

export default function WeatherDetailModal({ open, onClose, stop, temperatureUnit = 'F' }) {
  if (!stop) return null;

  const place = [stop.name, stop.region].filter(Boolean).join(', ');
  const temp = displayTemp(stop.tempF, temperatureUnit);
  const feels = displayTemp(stop.feelsLikeF ?? stop.tempF, temperatureUnit);
  const riskLabel = RISK_LABELS[stop.risk] || stop.risk;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Weather Details"
      labelledBy="rw-weather-detail-title"
      footer={
        <button type="button" className="rw-btn rw-btn--primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="rw-weather-detail">
        <div className="rw-weather-detail__hero">
          <div
            className="rw-forecast-card__icon"
            data-condition={stop.condition}
            aria-hidden="true"
          >
            <WeatherIcon condition={stop.condition} />
          </div>
          <div>
            <p className="rw-weather-detail__temp">
              {temp}°{temperatureUnit}
            </p>
            <p className="rw-weather-detail__condition">{stop.conditionLabel}</p>
          </div>
        </div>

        <p className="rw-weather-detail__place">{place}</p>
        <p className="rw-weather-detail__arrival">
          Estimated arrival: <strong>{stop.timeLabel}</strong>
        </p>
        <span className="rw-risk-badge" data-risk={stop.risk}>
          {riskLabel}
        </span>

        <div className="rw-weather-detail__grid">
          <div>
            <span className="rw-weather-detail__label">Feels like</span>
            <span className="rw-weather-detail__value">
              {feels}°{temperatureUnit}
            </span>
          </div>
          <div>
            <span className="rw-weather-detail__label">Humidity</span>
            <span className="rw-weather-detail__value">{stop.humidity ?? '—'}%</span>
          </div>
          <div>
            <span className="rw-weather-detail__label">Wind</span>
            <span className="rw-weather-detail__value">{stop.windMph ?? 0} mph</span>
          </div>
          <div>
            <span className="rw-weather-detail__label">Precipitation</span>
            <span className="rw-weather-detail__value">
              {typeof stop.precipIn === 'number' ? `${stop.precipIn.toFixed(2)} in` : '0 in'}
            </span>
          </div>
        </div>

        <p className="rw-modal__meta">
          Location: {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
        </p>
      </div>
    </ModalShell>
  );
}
