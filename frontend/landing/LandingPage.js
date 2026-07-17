import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { injectLandingStyles } from './utils/injectStyles';
import Header from './components/Header';
import RoutePlanner from './components/RoutePlanner';
import RouteMap from './components/RouteMap';
import DepartureTimeSlider from './components/DepartureTimeSlider';
import RiskTimeline from './components/RiskTimeline';
import ForecastCard from './components/ForecastCard';
import FeatureCard from './components/FeatureCard';
import AudienceCard from './components/AudienceCard';
import CTASection from './components/CTASection';
import WelcomeModal from './components/WelcomeModal';
import WeatherDetailModal from './components/WeatherDetailModal';
import {
  AboutModal,
  ContactModal,
  PrivacyModal,
  TermsModal,
} from './components/InfoModals';
import {
  AUDIENCES,
  FEATURES,
  RISK_SEGMENTS,
  ROUTE_GEOJSON,
  HOUR_TICKS,
  getStopsForDepartureOffset,
} from './data/mockRoute';
import {
  fetchLiveRouteWeather,
  buildStopsFromLiveRoute,
} from './utils/liveRouteWeather';

export default function LandingPage() {
  const plannerRef = useRef(null);
  const [temperatureUnit, setTemperatureUnit] = useState('F');
  const [departureHours, setDepartureHours] = useState(0);
  const [previewHours, setPreviewHours] = useState(0);
  const [selectedStop, setSelectedStop] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [demoMessage, setDemoMessage] = useState(
    'Demo route: Columbus → Chicago with sample weather. Enter your own route above to see live conditions.'
  );

  // Live route + weather payload (fetched once per search; recomputed locally for slider)
  const [live, setLive] = useState(null);
  const [departureAt, setDepartureAt] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Demo fallback until the user searches a real route
  const effectiveOffset = Math.min(12, Math.round(departureHours + previewHours));
  const demoStops = useMemo(() => getStopsForDepartureOffset(effectiveOffset), [effectiveOffset]);

  const liveView = useMemo(() => {
    if (!live) return null;
    return buildStopsFromLiveRoute(live, { departureAt, previewHours });
  }, [live, departureAt, previewHours]);

  const stops = liveView?.stops?.length ? liveView.stops : demoStops;
  const routeGeoJson = live?.routeGeoJson || ROUTE_GEOJSON;
  const riskSegments = liveView?.riskSegments?.length ? liveView.riskSegments : RISK_SEGMENTS;
  const hourTicks = liveView?.hourTicks?.length ? liveView.hourTicks : HOUR_TICKS;

  useEffect(() => {
    injectLandingStyles();
    if (typeof document !== 'undefined') {
      document.title = 'RoadWeather — Know the weather before you drive into it';
    }
  }, []);

  const focusPlanner = useCallback(() => {
    const el = plannerRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = el.querySelector('#rw-origin');
    if (input) input.focus({ preventScroll: true });
  }, []);

  const handleDepartureChange = useCallback((departure) => {
    if (departure?.at instanceof Date) setDepartureAt(departure.at);
    const hours = Math.max(0, Math.min(72, Number(departure?.hoursFromNow) || 0));
    setDepartureHours(hours);
    setPreviewHours(0);
  }, []);

  const handlePlanSubmit = useCallback(async ({ origin, destination, departure, originCoords }) => {
    const mapSection = document.getElementById('rw-map');
    if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const chosenDeparture = departure?.at instanceof Date ? departure.at : new Date();
    setDepartureAt(chosenDeparture);
    setPreviewHours(0);
    setLoading(true);
    setSearchError(null);
    setDemoMessage(`Checking live conditions for ${origin} → ${destination}…`);

    try {
      const result = await fetchLiveRouteWeather({
        origin,
        destination,
        originCoords: originCoords || null,
        departureAt: chosenDeparture,
      });
      setLive(result);
      setDemoMessage(
        `Live route: ${result.originName?.split(',')[0]} → ${result.destinationName?.split(',')[0]}, weather timed to your arrival at each stop.`
      );
    } catch (err) {
      setSearchError(err?.message || 'Could not load that route. Please try different locations.');
      setDemoMessage('Showing demo route. ' + (err?.message || 'Live search failed — please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkerSelect = useCallback((stop) => {
    setSelectedStop(stop);
  }, []);

  return (
    <div className="rw-landing" id="top">
      <Header
        onPlanRoute={focusPlanner}
        onOpenModal={setActiveModal}
        temperatureUnit={temperatureUnit}
        onTemperatureUnitChange={setTemperatureUnit}
      />

      <main>
        <section className="rw-hero" aria-labelledby="rw-hero-title">
          <div className="rw-container rw-container--wide">
            <div className="rw-hero__intro">
              <h1 id="rw-hero-title">Know the weather before you drive into it.</h1>
              <p>
                RoadWeather shows conditions timed to your journey — rain, wind, and risk along the
                route, not just at the destination.
              </p>
            </div>

            <div ref={plannerRef}>
              <RoutePlanner
                onSubmit={handlePlanSubmit}
                demoHint={demoMessage}
                temperatureUnit={temperatureUnit}
                onTemperatureUnitChange={setTemperatureUnit}
                onDepartureChange={handleDepartureChange}
                loading={loading}
                errorMessage={searchError}
              />
            </div>

            <div id="rw-map" className="rw-hero__map">
              <RouteMap
                stops={stops}
                routeGeoJson={routeGeoJson}
                temperatureUnit={temperatureUnit}
                onMarkerSelect={handleMarkerSelect}
              />
            </div>

            <DepartureTimeSlider
              value={previewHours}
              onChange={setPreviewHours}
              maxHours={12}
            />
          </div>
        </section>

        <RiskTimeline segments={riskSegments} hours={hourTicks} />

        <section className="rw-section" aria-labelledby="rw-forecast-title">
          <div className="rw-container rw-container--wide">
            <p className="rw-section__eyebrow">At a glance along your route</p>
            <h2 id="rw-forecast-title" className="rw-section__title">
              Every 30 minutes
            </h2>
            <div className="rw-forecast rw-forecast--scroll">
              {stops.map((stop) => (
                <ForecastCard
                  key={stop.id}
                  stop={stop}
                  temperatureUnit={temperatureUnit}
                  onSelect={handleMarkerSelect}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rw-section rw-section--white" id="features" aria-labelledby="rw-features-title">
          <div className="rw-container">
            <p className="rw-section__eyebrow">Why RoadWeather</p>
            <h2 id="rw-features-title" className="rw-section__title">
              Built for the drive, not the forecast page
            </h2>
            <div className="rw-features">
              {FEATURES.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="rw-section" id="for-drivers" aria-labelledby="rw-audience-title">
          <div className="rw-container">
            <p className="rw-section__eyebrow">Who it&apos;s for</p>
            <h2 id="rw-audience-title" className="rw-section__title">
              Built for every kind of journey
            </h2>
            <div className="rw-audience">
              {AUDIENCES.map((audience) => (
                <AudienceCard key={audience.id} audience={audience} />
              ))}
            </div>
          </div>
        </section>

        <CTASection onPlanRoute={focusPlanner} />
      </main>

      <footer className="rw-footer">
        <div className="rw-container rw-footer__inner">
          <span>© {new Date().getFullYear()} RoadWeather</span>
          <nav aria-label="Legal">
            <button type="button" className="rw-nav-linkbtn" onClick={() => setActiveModal('about')}>
              About
            </button>
            <button type="button" className="rw-nav-linkbtn" onClick={() => setActiveModal('terms')}>
              Terms
            </button>
            <button type="button" className="rw-nav-linkbtn" onClick={() => setActiveModal('privacy')}>
              Privacy
            </button>
            <button type="button" className="rw-nav-linkbtn" onClick={() => setActiveModal('contact')}>
              Contact
            </button>
          </nav>
        </div>
      </footer>

      <WelcomeModal onOpenTerms={() => setActiveModal('terms')} />
      <AboutModal open={activeModal === 'about'} onClose={() => setActiveModal(null)} />
      <TermsModal open={activeModal === 'terms'} onClose={() => setActiveModal(null)} />
      <PrivacyModal open={activeModal === 'privacy'} onClose={() => setActiveModal(null)} />
      <ContactModal open={activeModal === 'contact'} onClose={() => setActiveModal(null)} />
      <WeatherDetailModal
        open={Boolean(selectedStop)}
        stop={selectedStop}
        temperatureUnit={temperatureUnit}
        onClose={() => setSelectedStop(null)}
      />
    </div>
  );
}
