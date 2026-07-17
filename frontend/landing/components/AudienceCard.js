import React from 'react';
import { AudienceIcon } from './Icons';

export default function AudienceCard({ audience }) {
  return (
    <div className="rw-audience-card">
      <div className="rw-audience-card__icon" aria-hidden="true">
        <AudienceIcon name={audience.icon} />
      </div>
      <span>{audience.label}</span>
    </div>
  );
}
