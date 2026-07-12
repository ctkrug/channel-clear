import { sampleCurve } from '../wifi/overlap.js';
import { CURVE_COLORS, THEME } from './theme.js';
import { drawCurve, drawGrid, drawMarker, drawSweep, freqToX } from './render.js';

// Controller that turns app state into an animated blueprint spectrum. It owns
// the canvas' devicePixelRatio backing store (crisp on retina, recomputed on
// resize) and a small rAF tween loop so curves grow in and the recommendation
// marker slides rather than jump-cutting — the "gap closing in" motion from
// docs/DESIGN.md. Framework-free; the canvas is the product.

const FRAME_STEP = 1 / 12; // approach factor per frame toward animation targets

export function createSpectrumChart(canvas, options = {}) {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const raf = options.raf ?? defaultRaf;

  const ctx = canvas.getContext('2d');
  let cssWidth = 0;
  let cssHeight = 0;

  // Per-network animation records keyed by id: scale eases 0->1 on add and
  // 1->0 on remove (then the record is dropped). Removing a curve therefore
  // shrinks only its own trace, leaving the others untouched.
  const curves = new Map();
  let marker = null; // { x, targetX, alpha, label }
  let latest = { networks: [], band: null, freqRange: null, recommendation: null };
  let sweepPhase = 0;
  let animating = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = rect.width || canvas.clientWidth || 600;
    cssHeight = rect.height || canvas.clientHeight || 320;
    const dpr = options.devicePixelRatio ?? globalDpr();
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Reflow the plotted geometry to the new width and snap the marker there
    // instantly — a resize should reposition, not tween.
    reflowPoints();
    if (marker) {
      marker.targetX = markerTargetX();
      marker.x = marker.targetX;
    }
    draw();
  }

  // Recompute each sample's x for the current width (frequencies are fixed; only
  // the pixel mapping changes when the canvas resizes).
  function reflowPoints() {
    if (!latest.freqRange) return;
    for (const rec of curves.values()) {
      for (const p of rec.points) p.x = freqToX(p.freq, latest.freqRange, cssWidth);
    }
  }

  function setState(state) {
    latest = state;
    const seen = new Set();

    for (const network of state.networks) {
      seen.add(network.id);
      const points = buildPoints(network, state.freqRange, cssWidth);
      const existing = curves.get(network.id);
      if (existing) {
        existing.points = points;
        existing.target = 1;
        existing.removing = false;
      } else {
        curves.set(network.id, {
          points,
          color: colorFor(curves.size),
          scale: reducedMotion ? 1 : 0,
          target: 1,
          removing: false,
        });
      }
    }
    // Mark departed networks for shrink-out.
    for (const [id, rec] of curves) {
      if (!seen.has(id)) {
        rec.target = 0;
        rec.removing = true;
      }
    }

    // Recommendation marker.
    if (state.recommendation && state.networks.length > 0) {
      const x = freqToX(state.recommendation.freq, state.freqRange, cssWidth);
      const label = `CH ${state.recommendation.channel}`;
      if (marker) {
        marker.targetX = x;
        marker.label = label;
      } else {
        marker = { x, targetX: x, alpha: reducedMotion ? 1 : 0, label };
      }
      marker.targetAlpha = 1;
    } else if (marker) {
      marker.targetAlpha = 0;
    }

    if (reducedMotion) settleImmediately();
    ensureAnimating();
  }

  function settleImmediately() {
    for (const [id, rec] of curves) {
      rec.scale = rec.target;
      if (rec.removing) curves.delete(id);
    }
    if (marker) {
      marker.x = marker.targetX;
      marker.alpha = marker.targetAlpha ?? marker.alpha;
      if (marker.alpha === 0) marker = null;
    }
  }

  // Advance every animation one step; returns true while anything is still
  // moving (or the empty-state sweep needs to keep drifting).
  function step() {
    let active = false;
    for (const [id, rec] of curves) {
      rec.scale += (rec.target - rec.scale) * FRAME_STEP;
      if (Math.abs(rec.target - rec.scale) < 0.005) {
        rec.scale = rec.target;
        if (rec.removing) curves.delete(id);
      } else {
        active = true;
      }
    }
    if (marker) {
      marker.x += (marker.targetX - marker.x) * FRAME_STEP;
      const ta = marker.targetAlpha ?? 1;
      marker.alpha += (ta - marker.alpha) * FRAME_STEP;
      if (Math.abs(marker.targetX - marker.x) > 0.5 || Math.abs(ta - marker.alpha) > 0.01) {
        active = true;
      } else {
        marker.x = marker.targetX;
        marker.alpha = ta;
        if (ta === 0) marker = null;
      }
    }
    // Keep the idle placeholder sweep drifting — but not under reduced motion,
    // where a perpetual animation is both unwelcome and a needless rAF spin.
    if (!reducedMotion && latest.networks.length === 0) {
      sweepPhase = (sweepPhase + 0.006) % 1;
      active = true;
    }
    return active;
  }

  function draw() {
    if (!ctx || cssWidth === 0) return;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Panel backdrop with a faint vertical gradient for depth.
    const bg = ctx.createLinearGradient(0, 0, 0, cssHeight);
    bg.addColorStop(0, THEME.surface2);
    bg.addColorStop(1, THEME.bg);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    if (!latest.freqRange) return; // nothing to plot until first setState

    drawGrid(ctx, cssWidth, cssHeight, latest.band, latest.freqRange);

    if (curves.size === 0 && latest.networks.length === 0) {
      const sweepX = 40 + sweepPhase * (cssWidth - 80);
      drawSweep(ctx, cssWidth, cssHeight, sweepX);
      drawEmptyHint(ctx, cssWidth, cssHeight);
      return;
    }

    for (const rec of curves.values()) {
      drawCurve(ctx, cssHeight, rec.points, rec.color, rec.scale);
    }
    if (marker && marker.alpha > 0.01) {
      drawMarker(ctx, cssWidth, cssHeight, marker.x, marker.label, marker.alpha);
    }
  }

  function ensureAnimating() {
    // Recompute x positions in case width changed since points were built.
    reflowPoints();
    if (marker) marker.targetX = markerTargetX();
    if (animating) return;
    animating = true;
    tick();
  }

  function markerTargetX() {
    if (!latest.recommendation) return marker ? marker.targetX : 0;
    return freqToX(latest.recommendation.freq, latest.freqRange, cssWidth);
  }

  function tick() {
    const active = step();
    draw();
    if (active) {
      raf(tick);
    } else {
      animating = false;
    }
  }

  function colorFor(index) {
    return CURVE_COLORS[index % CURVE_COLORS.length];
  }

  function destroy() {
    curves.clear();
    marker = null;
  }

  return { resize, setState, draw, destroy };
}

function buildPoints(network, freqRange, width) {
  const samples = sampleCurve(network, freqRange, 1);
  return samples.map((s) => ({
    freq: s.freq,
    energy: s.energy,
    x: freqToX(s.freq, freqRange, width),
  }));
}

function drawEmptyHint(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = THEME.textMuted;
  ctx.font = '13px ui-monospace, "SF Mono", Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Awaiting signal — add a network to begin', width / 2, height / 2);
  ctx.restore();
}

function prefersReducedMotion() {
  try {
    return typeof matchMedia !== 'undefined'
      ? matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch {
    return false;
  }
}

function globalDpr() {
  return typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
}

function defaultRaf(cb) {
  if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(cb);
  return setTimeout(cb, 16);
}
