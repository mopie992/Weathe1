import React from 'react';
import ModalShell from './ModalShell';

function CloseFooter({ onClose }) {
  return (
    <button type="button" className="rw-btn rw-btn--primary" onClick={onClose}>
      Close
    </button>
  );
}

export function AboutModal({ open, onClose }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="About RoadWeather"
      labelledBy="rw-about-title"
      footer={<CloseFooter onClose={onClose} />}
    >
      <p>
        RoadWeather helps you visualize weather you may encounter along your journey, not just at
        your starting point or destination. By showing predictive conditions along your route, it
        gives you a clearer picture of potential rain, snow, storms, and other weather impacts ahead.
      </p>
      <p>
        Use departure timing to explore how conditions may change if you leave earlier or later,
        helping you make more informed travel plans and reduce surprises on the road.
      </p>
    </ModalShell>
  );
}

export function TermsModal({ open, onClose }) {
  const currentDate = new Date().toLocaleDateString();
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Terms of Use"
      labelledBy="rw-terms-title"
      footer={<CloseFooter onClose={onClose} />}
    >
      <p className="rw-modal__meta">Last updated: {currentDate}</p>
      <p>
        These Terms govern your use of the RoadWeather application and related services
        (&quot;Service&quot;), operated by Audiospoons LLC (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;). By using the Service, you agree to these Terms.
      </p>
      <h3>1. Informational Use Only</h3>
      <p>
        RoadWeather provides route-based and weather-related information for informational purposes
        only. It does not provide driving, safety, professional, or legal advice. You are responsible
        for your own travel decisions.
      </p>
      <h3>2. Weather Is Predictive</h3>
      <p>
        Weather data shown in the Service is predictive and estimated. Forecasts represent conditions
        you may encounter, not conditions you will encounter. Actual conditions can change rapidly
        and may differ from what is displayed.
      </p>
      <h3>3. Accuracy and Availability</h3>
      <p>
        We do not guarantee that the Service or its information will be accurate, complete, current,
        or available at all times.
      </p>
      <h3>4. User Responsibility</h3>
      <ul>
        <li>You are responsible for complying with all applicable laws and traffic regulations.</li>
        <li>You will not use the Service in a distracting or unsafe manner while driving.</li>
        <li>You assume all risks related to travel and weather conditions.</li>
      </ul>
      <h3>5. Third-Party Data</h3>
      <p>
        The Service may use third-party weather, mapping, or data providers. We do not control these
        providers and are not responsible for their accuracy, availability, or reliability.
      </p>
      <h3>6. Limitation of Liability</h3>
      <p>
        To the fullest extent permitted by law, Audiospoons LLC is not liable for any damages arising
        from your use of, or inability to use, the Service.
      </p>
      <h3>7. No Warranties</h3>
      <p>The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind.</p>
      <h3>8. Changes to These Terms</h3>
      <p>
        We may update these Terms from time to time. Continued use of the Service after changes are
        posted means you accept the updated Terms.
      </p>
    </ModalShell>
  );
}

export function PrivacyModal({ open, onClose }) {
  const currentDate = new Date().toLocaleDateString();
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Privacy Policy"
      labelledBy="rw-privacy-title"
      footer={<CloseFooter onClose={onClose} />}
    >
      <p className="rw-modal__meta">Last updated: {currentDate}</p>
      <p>
        This Privacy Policy explains how information is handled when you use the RoadWeather
        application and related services (&quot;Service&quot;), operated by Audiospoons LLC.
      </p>
      <h3>1. Information We Collect</h3>
      <p>RoadWeather is designed to collect minimal information. Depending on use, we may collect:</p>
      <ul>
        <li>Route or location information you voluntarily enter</li>
        <li>General usage data (interactions, performance, or errors)</li>
        <li>Device information (device type or operating system)</li>
      </ul>
      <h3>2. How Information Is Used</h3>
      <ul>
        <li>Provide route-based weather information</li>
        <li>Improve app performance and reliability</li>
        <li>Monitor usage trends and fix issues</li>
      </ul>
      <h3>3. Location Information</h3>
      <p>
        If you provide location or route data, it is used solely to display weather conditions along
        your route. Location data is not used to track you outside the Service.
      </p>
      <h3>4. Third-Party Services</h3>
      <p>The Service may use third parties for weather data, maps or routing, and diagnostics.</p>
      <h3>5. Data Retention</h3>
      <p>We retain information only as long as necessary to operate and improve the Service.</p>
      <h3>6. Data Security</h3>
      <p>
        We take reasonable measures to protect information, but no system can be guaranteed 100%
        secure.
      </p>
      <h3>7. Children&apos;s Privacy</h3>
      <p>The Service is not directed to children under 13.</p>
      <h3>8. Changes to This Policy</h3>
      <p>We may update this policy from time to time. Continued use means you accept the updates.</p>
    </ModalShell>
  );
}

export function ContactModal({ open, onClose }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Contact / Support"
      labelledBy="rw-contact-title"
      footer={<CloseFooter onClose={onClose} />}
    >
      <p>Need help or have a question?</p>
      <p>
        Reach us at:{' '}
        <a className="rw-modal__email" href="mailto:support@roadweather.app">
          support@roadweather.app
        </a>
      </p>
      <p>If you have ideas or suggestions to improve RoadWeather, we&apos;d love to hear them.</p>
    </ModalShell>
  );
}
