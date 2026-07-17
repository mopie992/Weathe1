import React from 'react';
import { ArrowRight } from './Icons';

export default function CTASection({ onPlanRoute }) {
  return (
    <section className="rw-cta" aria-labelledby="rw-cta-title">
      <div className="rw-container">
        <div className="rw-cta__card">
          <p id="rw-cta-title">See what&apos;s waiting down the road</p>
          <button type="button" className="rw-btn rw-btn--primary" onClick={onPlanRoute}>
            Plan Your Route
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}
