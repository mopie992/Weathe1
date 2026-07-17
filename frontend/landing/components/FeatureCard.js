import React from 'react';
import { FeatureIcon } from './Icons';

export default function FeatureCard({ feature }) {
  return (
    <article className="rw-feature-card">
      <div className="rw-feature-card__icon" aria-hidden="true">
        <FeatureIcon name={feature.icon} />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.body}</p>
    </article>
  );
}
