import React from 'react';

function formatOffset(hours) {
  if (hours === 0) return 'Departure time';
  if (hours === 1) return '+1 hour from departure';
  return `+${hours} hours from departure`;
}

export default function DepartureTimeSlider({
  value = 0,
  onChange,
  maxHours = 12,
  id = 'rw-departure-slider',
}) {
  const hours = Math.round(value);

  return (
    <div className="rw-slider">
      <label className="rw-slider__label" htmlFor={id}>
        Preview how weather changes if you leave later (next {maxHours}h from your chosen departure)
      </label>
      <input
        id={id}
        className="rw-slider__input"
        type="range"
        min={0}
        max={maxHours}
        step={1}
        value={hours}
        onChange={(e) => onChange?.(Number(e.target.value))}
        aria-valuemin={0}
        aria-valuemax={maxHours}
        aria-valuenow={hours}
        aria-valuetext={formatOffset(hours)}
      />
      <div className="rw-slider__meta" aria-hidden="true">
        <span>As planned</span>
        <span className="rw-slider__value">{formatOffset(hours)}</span>
        <span>+{maxHours}h</span>
      </div>
    </div>
  );
}
