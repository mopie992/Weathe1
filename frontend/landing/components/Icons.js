import React from 'react';

const svgProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 19.2 5 15.5 5 11V6l7-3z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M12 3l7 3v5c0 4.5-3 8.2-7 9.5C8 19.2 5 15.5 5 11V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
      />
      <path d="M9.5 12.5h3l-1.5 4 4-5.5h-3L13.5 7 9.5 12.5z" fill="currentColor" />
    </svg>
  );
}

export function WeatherIcon({ condition }) {
  switch (condition) {
    case 'rain':
    case 'storms':
      return (
        <svg {...svgProps}>
          <path d="M7 15a4 4 0 01.5-7.9A5.5 5.5 0 0118 10a3.5 3.5 0 01.5 7H7z" />
          <path d="M9 17v3M12 18v3M15 17v3" />
        </svg>
      );
    case 'wind':
      return (
        <svg {...svgProps}>
          <path d="M4 12h11a3 3 0 100-6 2.8 2.8 0 00-1 .2" />
          <path d="M4 16h9a2.5 2.5 0 110 5 2.3 2.3 0 01-.9-.2" />
        </svg>
      );
    case 'snow':
    case 'ice':
      return (
        <svg {...svgProps}>
          <path d="M12 4v16M6 7l12 10M18 7L6 17M5 12h14" />
        </svg>
      );
    case 'fog':
    case 'low-visibility':
      return (
        <svg {...svgProps}>
          <path d="M4 10h16M4 14h12M4 18h14" />
        </svg>
      );
    case 'cloudy':
      return (
        <svg {...svgProps}>
          <path d="M7 16a4 4 0 01.5-7.9A5.5 5.5 0 0118 11a3.5 3.5 0 01.5 7H7z" />
        </svg>
      );
    case 'clear':
    default:
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
        </svg>
      );
  }
}

export function FeatureIcon({ name }) {
  if (name === 'warning') {
    return (
      <svg {...svgProps}>
        <path d="M12 4l9 16H3L12 4z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg {...svgProps}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

export function AudienceIcon({ name }) {
  const common = { ...svgProps, width: 24, height: 24 };
  switch (name) {
    case 'roadtrip':
      return (
        <svg {...common}>
          <path d="M4 16l2-8h12l2 8" />
          <circle cx="8" cy="17" r="2" />
          <circle cx="16" cy="17" r="2" />
        </svg>
      );
    case 'rv':
      return (
        <svg {...common}>
          <path d="M3 15h15l3-5H9L7 15" />
          <path d="M3 15v3h3M18 15v3h3" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="17" cy="18" r="1.5" />
        </svg>
      );
    case 'moto':
      return (
        <svg {...common}>
          <circle cx="7" cy="16" r="3" />
          <circle cx="17" cy="16" r="3" />
          <path d="M10 16h4l-2-6h3l2 4" />
        </svg>
      );
    case 'fleet':
      return (
        <svg {...common}>
          <path d="M3 14h11v4H3zM14 16h5l2-4h-4l-1.5 2" />
          <circle cx="7" cy="19" r="1.5" />
          <circle cx="16" cy="19" r="1.5" />
        </svg>
      );
    case 'commute':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 20v-1a5 5 0 0110 0v1" />
        </svg>
      );
  }
}

export function ArrowRight() {
  return (
    <svg {...svgProps} width="18" height="18">
      <path d="M5 12h12M13 6l6 6-6 6" />
    </svg>
  );
}

export function MenuIcon({ open }) {
  return open ? (
    <svg {...svgProps} width="20" height="20">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg {...svgProps} width="20" height="20">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
