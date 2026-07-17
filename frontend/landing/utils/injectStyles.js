import tokensCss from '../styles/tokens.css.js';
import landingCss from '../styles/landing.css.js';

const STYLE_IDS = {
  tokens: 'rw-tokens-css',
  landing: 'rw-landing-css',
};

function ensureStyle(id, cssText) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);
}

export function injectLandingStyles() {
  ensureStyle(STYLE_IDS.tokens, tokensCss);
  ensureStyle(STYLE_IDS.landing, landingCss);
}
