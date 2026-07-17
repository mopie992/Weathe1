import React from 'react';
import { HOUR_TICKS, RISK_SEGMENTS } from '../data/mockRoute';

export default function RiskTimeline({ segments = RISK_SEGMENTS, hours = HOUR_TICKS }) {
  const totalFlex = segments.reduce((sum, s) => sum + s.flex, 0);

  return (
    <section className="rw-section" id="how-it-works" aria-labelledby="rw-timeline-title">
      <div className="rw-container">
        <p className="rw-section__eyebrow">Route weather overview</p>
        <h2 id="rw-timeline-title" className="rw-section__title">
          Conditions across your drive
        </h2>

        <div className="rw-timeline">
          <div className="rw-timeline__track-wrap">
            <div
              className="rw-timeline__track"
              role="img"
              aria-label={segments.map((s) => `${s.label}: ${s.hoursFrom} to ${s.hoursTo} hours`).join('. ')}
            >
              {segments.map((seg) => (
                <div
                  key={seg.id}
                  className="rw-timeline__seg"
                  data-risk={seg.risk}
                  style={{ flex: seg.flex }}
                  title={`${seg.label} (${seg.hoursFrom}–${seg.hoursTo} hrs)`}
                />
              ))}
            </div>

            <div className="rw-timeline__labels" aria-hidden="true">
              {segments.map((seg) => (
                <div
                  key={`${seg.id}-label`}
                  className="rw-timeline__label"
                  style={{ flex: seg.flex, width: `${(seg.flex / totalFlex) * 100}%` }}
                >
                  {seg.label}
                </div>
              ))}
            </div>

            <div className="rw-timeline__hours" aria-hidden="true">
              {hours.map((h) => (
                <span key={h}>{h} hrs</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
