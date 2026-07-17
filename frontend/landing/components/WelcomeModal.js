import React, { useEffect, useState } from 'react';
import ModalShell from './ModalShell';

const STORAGE_KEY = 'roadweather_welcome_seen';

export default function WelcomeModal({ onOpenTerms }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  return (
    <ModalShell open={open} onClose={close} welcome labelledBy="rw-welcome-title">
      <img
        className="rw-modal__logo"
        src="/favicon-96x96.png"
        alt=""
        width={72}
        height={72}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <h2 id="rw-welcome-title">Welcome to RoadWeather</h2>
      <p>
        RoadWeather helps visualize weather you may encounter along your route, not just at your
        start or destination. By showing predictive weather conditions ahead, it can help you
        anticipate potential rain, snow, storms, and road hazards. Use it to plan routes, adjust
        departure times, and stay better informed while traveling.
      </p>
      <p>
        By using RoadWeather, you agree to our{' '}
        <button
          type="button"
          className="rw-modal__email"
          style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
          onClick={() => {
            close();
            onOpenTerms?.();
          }}
        >
          Terms of Use
        </button>
        .
      </p>
      <button type="button" className="rw-btn rw-btn--primary" onClick={close} style={{ minWidth: 120 }}>
        OK
      </button>
    </ModalShell>
  );
}
