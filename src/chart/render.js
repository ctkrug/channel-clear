import { CHANNELS_2_4GHZ, CHANNELS_5GHZ, BAND_2_4GHZ } from '../wifi/channels.js';
import { THEME } from './theme.js';

// Pure drawing primitives for the spectrum chart. Everything here takes a 2D
// context already transformed to CSS-pixel space (the controller handles the
// devicePixelRatio scaling) plus explicit width/height, so these functions are
// deterministic and unit-testable with a recording mock context.

export function freqToX(freq, freqRange, width) {
  const span = freqRange.max - freqRange.min || 1;
  return ((freq - freqRange.min) / span) * width;
}

// Channel tick positions for the x-axis: channel number + its center frequency.
export function channelTicks(band) {
  const table = band === BAND_2_4GHZ ? CHANNELS_2_4GHZ : CHANNELS_5GHZ;
  return Object.entries(table).map(([channel, freq]) => ({
    channel: Number(channel),
    freq,
  }));
}

// The blueprint grid: horizontal energy gridlines plus a faint vertical line
// and channel label at every channel center. This is the personality of the
// page, so it draws even in the empty state.
export function drawGrid(ctx, width, height, band, freqRange) {
  const bottom = height - AXIS_H;

  ctx.save();
  ctx.lineWidth = 1;

  // Horizontal energy gridlines (0%, 25%, 50%, 75%, 100%).
  for (let i = 0; i <= 4; i += 1) {
    const y = bottom - (i / 4) * (bottom - PAD_TOP);
    ctx.strokeStyle = i === 0 ? THEME.gridLineStrong : THEME.gridLine;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Vertical channel lines + labels.
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '11px ui-monospace, "SF Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const ticks = channelTicks(band);
  const step = ticks.length > 9 ? 2 : 1; // thin out crowded 2.4GHz labels
  ticks.forEach((tick, i) => {
    const x = freqToX(tick.freq, freqRange, width);
    ctx.strokeStyle = THEME.gridLine;
    ctx.beginPath();
    ctx.moveTo(x, PAD_TOP);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    if (i % step === 0) ctx.fillText(String(tick.channel), x, bottom + 6);
  });

  ctx.restore();
}

// One network's overlap curve: a glowing filled trace, like a phosphor sweep.
export function drawCurve(ctx, height, points, color, scale = 1) {
  if (!points || points.length === 0) return;
  const bottom = height - AXIS_H;
  const usable = bottom - PAD_TOP;

  // points carry {x, energy}; x is precomputed by the caller for the range.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, bottom);
  for (const p of points) {
    ctx.lineTo(p.x, bottom - p.energy * scale * usable);
  }
  ctx.lineTo(points[points.length - 1].x, bottom);
  ctx.closePath();

  ctx.globalAlpha = 0.28 * scale;
  ctx.fillStyle = color;
  ctx.fill();

  ctx.globalAlpha = scale;
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

// The recommended-channel marker: an amber vertical line topped with a
// downward-pointing arrow and a channel label, the "aim here" cue.
export function drawMarker(ctx, width, height, x, label, alpha = 1) {
  const bottom = height - AXIS_H;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = THEME.accentSupport;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x, PAD_TOP + 14);
  ctx.lineTo(x, bottom);
  ctx.stroke();
  ctx.setLineDash([]);

  // Downward arrowhead.
  ctx.fillStyle = THEME.accentSupport;
  ctx.beginPath();
  ctx.moveTo(x, PAD_TOP + 16);
  ctx.lineTo(x - 6, PAD_TOP + 4);
  ctx.lineTo(x + 6, PAD_TOP + 4);
  ctx.closePath();
  ctx.fill();

  // Label pill.
  if (label) {
    ctx.font = 'bold 12px ui-monospace, "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = label;
    const w = ctx.measureText(text).width + 14;
    const px = clamp(x, w / 2, width - w / 2);
    ctx.fillStyle = THEME.accentSupport;
    roundRect(ctx, px - w / 2, PAD_TOP - 20, w, 18, 5);
    ctx.fill();
    ctx.fillStyle = THEME.bg;
    ctx.fillText(text, px, PAD_TOP - 11);
  }

  ctx.restore();
}

// The pre-data empty state: a dim placeholder sweep line drifting across the
// grid so the panel reads as a live instrument, not a blank box.
export function drawSweep(ctx, width, height, sweepX) {
  const bottom = height - AXIS_H;
  ctx.save();
  const grad = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0);
  grad.addColorStop(0, 'rgba(61,219,255,0)');
  grad.addColorStop(0.5, 'rgba(61,219,255,0.25)');
  grad.addColorStop(1, 'rgba(61,219,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(sweepX - 40, PAD_TOP, 80, bottom - PAD_TOP);

  ctx.strokeStyle = 'rgba(61,219,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sweepX, PAD_TOP);
  ctx.lineTo(sweepX, bottom);
  ctx.stroke();
  ctx.restore();
}

export const PAD_TOP = 28;
export const AXIS_H = 22;

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
