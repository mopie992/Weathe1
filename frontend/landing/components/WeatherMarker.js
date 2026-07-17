/**
 * Live-style weather marker bubbles (colored cards with icon, temp, arrival time).
 * Mapbox owns the DOM lifecycle.
 */

function conditionKey(condition) {
  return String(condition || '').toLowerCase();
}

export function getWeatherColor(condition) {
  const cond = conditionKey(condition);
  if (cond.includes('rain') || cond.includes('drizzle')) return 'rgba(59, 130, 246, 0.85)';
  if (cond.includes('snow') || cond.includes('ice')) return 'rgba(255, 255, 255, 0.92)';
  if (cond.includes('storm') || cond.includes('thunder')) return 'rgba(99, 102, 241, 0.85)';
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('low-visibility')) {
    return 'rgba(156, 163, 175, 0.85)';
  }
  if (cond.includes('wind')) return 'rgba(245, 158, 11, 0.85)';
  if (cond.includes('clear')) return 'rgba(251, 191, 36, 0.85)';
  if (cond.includes('cloud')) return 'rgba(148, 163, 184, 0.85)';
  return 'rgba(148, 163, 184, 0.85)';
}

export function getWeatherIcon(condition) {
  const cond = conditionKey(condition);
  if (cond.includes('rain') || cond.includes('drizzle')) return '🌧';
  if (cond.includes('snow') || cond.includes('ice')) return '❄';
  if (cond.includes('storm') || cond.includes('thunder')) return '⛈';
  if (cond.includes('fog') || cond.includes('mist') || cond.includes('low-visibility')) return '🌫';
  if (cond.includes('wind')) return '💨';
  if (cond.includes('clear')) return '☀';
  if (cond.includes('cloud')) return '☁';
  return '🌤';
}

function isLightBackground(condition) {
  const cond = conditionKey(condition);
  return cond.includes('snow') || cond.includes('ice') || cond.includes('clear');
}

function bindSelect(el, stop, onSelect) {
  el.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
  });
  el.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(stop);
  });
}

export function createWeatherMarkerElement(stop, { onSelect, temperatureUnit = 'F' } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'rw-live-marker';

  const temp =
    temperatureUnit === 'C' ? Math.round(((stop.tempF - 32) * 5) / 9) : stop.tempF;
  const color = getWeatherColor(stop.condition);
  const icon = getWeatherIcon(stop.condition);
  const light = isLightBackground(stop.condition);
  const textColor = light ? '#1f2937' : '#ffffff';
  const shadow = light
    ? '0 1px 2px rgba(255,255,255,0.85)'
    : '0 1px 2px rgba(0,0,0,0.75)';

  el.style.backgroundColor = color;
  el.style.color = textColor;
  el.setAttribute(
    'aria-label',
    `${stop.name}, ${stop.timeLabel}, ${temp} degrees ${temperatureUnit}, ${stop.conditionLabel}. Open details.`
  );

  el.innerHTML = `
    <span class="rw-live-marker__icon" aria-hidden="true">${icon}</span>
    <span class="rw-live-marker__temp" style="color:${textColor};text-shadow:${shadow}">${temp}°${temperatureUnit}</span>
    <span class="rw-live-marker__time" style="color:${textColor};text-shadow:${shadow}">${stop.timeLabel || ''}</span>
  `;

  el.addEventListener('mouseenter', () => {
    el.classList.add('is-hover');
  });
  el.addEventListener('mouseleave', () => {
    el.classList.remove('is-hover');
  });

  bindSelect(el, stop, onSelect);
  return el;
}

export function createPinElement(kind) {
  const el = document.createElement('div');
  el.className = `rw-map-pin rw-map-pin--${kind}`;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

export function createWarnElement(label, { onSelect, stop } = {}) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'rw-map-warn';
  el.textContent = '!';
  el.title = label || 'Caution';
  el.setAttribute('aria-label', label || 'Caution along route');
  if (onSelect && stop) bindSelect(el, stop, onSelect);
  return el;
}
