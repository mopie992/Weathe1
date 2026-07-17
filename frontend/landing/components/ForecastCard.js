import React from 'react';
import { RISK_LABELS } from '../data/mockRoute';
import { WeatherIcon } from './Icons';

function displayTemp(tempF, unit) {
  if (unit === 'C') return Math.round(((tempF - 32) * 5) / 9);
  return tempF;
}

export default function ForecastCard({ stop, temperatureUnit = 'F', onSelect }) {
  const place = [stop.name, stop.region].filter(Boolean).join(', ');
  const riskLabel = RISK_LABELS[stop.risk] || stop.risk;
  const temp = displayTemp(stop.tempF, temperatureUnit);

  return (
    <article
      className={`rw-forecast-card${onSelect ? ' rw-forecast-card--clickable' : ''}`}
      aria-label={`${place} at ${stop.timeLabel}: ${stop.conditionLabel}, ${temp}°${temperatureUnit}, ${riskLabel}`}
      {...(onSelect
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: () => onSelect(stop),
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(stop);
              }
            },
          }
        : {})}
    >
      <div className="rw-forecast-card__top">
        <p className="rw-forecast-card__time">{stop.timeLabel}</p>
        <h3 className="rw-forecast-card__place">{place}</h3>
      </div>

      <div className="rw-forecast-card__weather">
        <div className="rw-forecast-card__icon" data-condition={stop.condition} aria-hidden="true">
          <WeatherIcon condition={stop.condition} />
        </div>
        <div>
          <p className="rw-forecast-card__temp">
            {temp}°{temperatureUnit}
          </p>
          <p className="rw-forecast-card__condition">
            <span className="sr-only">Conditions: </span>
            {stop.conditionLabel}
          </p>
        </div>
      </div>

      <span className="rw-risk-badge" data-risk={stop.risk}>
        {riskLabel}
      </span>
    </article>
  );
}
