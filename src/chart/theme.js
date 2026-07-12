// Canvas-side copy of the design tokens from docs/DESIGN.md. The CSS owns the
// DOM's colors; the canvas can't read CSS custom properties cheaply per frame,
// so the handful the chart needs live here as constants. Keep in sync with
// docs/DESIGN.md if the palette changes.
export const THEME = {
  bg: '#0a0e14',
  surface2: '#1a2433',
  text: '#e6edf5',
  textMuted: '#7c8ba1',
  accent: '#3ddbff', // live trace
  accentSupport: '#ffb454', // recommended-channel marker/arrow
  success: '#3ddc84',
  gridLine: 'rgba(61, 219, 255, 0.08)',
  gridLineStrong: 'rgba(61, 219, 255, 0.16)',
};

// Curve palette for stacked network traces. Cyan-forward per the blueprint
// direction, cycling through cool instrument hues so overlapping networks stay
// distinguishable without leaving the palette.
export const CURVE_COLORS = [
  '#3ddbff',
  '#5eead4',
  '#818cf8',
  '#c084fc',
  '#38bdf8',
  '#2dd4bf',
];
