import { THEME } from '../chart/theme.js';

// Generates the favicon in code as an inline SVG data-URI: a blueprint-dark
// tile with a cyan spectrum peak and an amber "clear channel" tick — the app's
// story in 32px. No binary asset, and it can't drift from the palette.
export function faviconDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${THEME.bg}"/>
  <path d="M2 24 Q9 24 12 12 Q13 8 14 12 Q17 24 24 24" fill="none"
    stroke="${THEME.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="25" y1="7" x2="25" y2="25" stroke="${THEME.accentSupport}" stroke-width="2.5"
    stroke-linecap="round"/>
  <circle cx="25" cy="7" r="2.4" fill="${THEME.accentSupport}"/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Installs (or updates) the favicon link in <head>.
export function installFavicon(doc = document) {
  let link = doc.querySelector('link[rel="icon"]');
  if (!link) {
    link = doc.createElement('link');
    link.rel = 'icon';
    doc.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  link.href = faviconDataUri();
  return link;
}
