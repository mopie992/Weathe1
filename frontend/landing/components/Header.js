import React, { useState } from 'react';
import { LogoMark, MenuIcon } from './Icons';

const NAV = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#features', label: 'Features' },
  { href: '#for-drivers', label: 'For Drivers' },
];

export default function Header({
  onPlanRoute,
  onOpenModal,
  temperatureUnit = 'F',
  onTemperatureUnitChange,
}) {
  const [open, setOpen] = useState(false);

  const handleNav = (event, href) => {
    setOpen(false);
    if (href.startsWith('#')) {
      event.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openModal = (id) => {
    setOpen(false);
    onOpenModal?.(id);
  };

  return (
    <header className="rw-header">
      <div className="rw-container rw-container--wide rw-header__inner">
        <a className="rw-logo" href="#top" onClick={(e) => handleNav(e, '#top')}>
          <span className="rw-logo__mark">
            <LogoMark />
          </span>
          <span>RoadWeather</span>
        </a>

        <nav className="rw-nav" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} onClick={(e) => handleNav(e, item.href)}>
              {item.label}
            </a>
          ))}
          <button type="button" className="rw-nav-linkbtn" onClick={() => openModal('about')}>
            About
          </button>
        </nav>

        <div className="rw-header__actions">
          <div className="rw-unit-toggle rw-unit-toggle--header" role="group" aria-label="Temperature unit">
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
          <button type="button" className="rw-btn rw-btn--primary rw-btn--header" onClick={onPlanRoute}>
            Plan a Route
          </button>
          <button
            type="button"
            className="rw-menu-toggle"
            aria-expanded={open}
            aria-controls="rw-mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <nav
        id="rw-mobile-nav"
        className={`rw-mobile-nav${open ? ' is-open' : ''}`}
        aria-label="Mobile"
      >
        {NAV.map((item) => (
          <a key={item.href} href={item.href} onClick={(e) => handleNav(e, item.href)}>
            {item.label}
          </a>
        ))}
        <button type="button" onClick={() => openModal('about')}>About</button>
        <button type="button" onClick={() => openModal('terms')}>Terms of Use</button>
        <button type="button" onClick={() => openModal('privacy')}>Privacy Policy</button>
        <button type="button" onClick={() => openModal('contact')}>Contact / Support</button>
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
        <button
          type="button"
          className="rw-btn rw-btn--primary rw-btn--block"
          onClick={() => {
            setOpen(false);
            onPlanRoute();
          }}
        >
          Plan a Route
        </button>
      </nav>
    </header>
  );
}
