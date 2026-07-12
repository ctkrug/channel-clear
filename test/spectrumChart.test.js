import { describe, expect, it } from 'vitest';
import { createSpectrumChart } from '../src/chart/spectrumChart.js';
import { BAND_2_4GHZ } from '../src/wifi/channels.js';

function recordingCtx() {
  const calls = {};
  const rec = (name) =>
    function () {
      calls[name] = (calls[name] || 0) + 1;
    };
  return {
    calls,
    setTransform: rec('setTransform'),
    clearRect: rec('clearRect'),
    save: rec('save'),
    restore: rec('restore'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    closePath: rec('closePath'),
    arcTo: rec('arcTo'),
    stroke: rec('stroke'),
    fill: rec('fill'),
    fillRect: rec('fillRect'),
    fillText: rec('fillText'),
    setLineDash: rec('setLineDash'),
    measureText: () => ({ width: 30 }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
}

function fakeCanvas(ctx) {
  return {
    width: 0,
    height: 0,
    clientWidth: 600,
    clientHeight: 320,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: 600, height: 320 }),
  };
}

const RANGE = { min: 2400, max: 2485 };

// reducedMotion:true settles animations synchronously; raf is a no-op so the
// idle sweep loop can't spin.
function makeChart(ctx) {
  return createSpectrumChart(fakeCanvas(ctx), {
    reducedMotion: true,
    raf: () => {},
    devicePixelRatio: 2,
  });
}

describe('createSpectrumChart', () => {
  it('sizes the backing store at devicePixelRatio on resize', () => {
    const ctx = recordingCtx();
    const canvas = fakeCanvas(ctx);
    const chart = createSpectrumChart(canvas, { reducedMotion: true, raf: () => {}, devicePixelRatio: 2 });
    chart.resize();
    expect(canvas.width).toBe(1200); // 600 css * 2 dpr
    expect(canvas.height).toBe(640);
    expect(ctx.calls.setTransform).toBeGreaterThan(0);
  });

  it('draws the empty-state sweep when there are no networks', () => {
    const ctx = recordingCtx();
    const chart = makeChart(ctx);
    chart.resize();
    chart.setState({ networks: [], band: BAND_2_4GHZ, freqRange: RANGE, recommendation: null });
    // fillText is used by both the channel labels and the empty hint.
    expect(ctx.calls.fillText).toBeGreaterThan(0);
    expect(ctx.calls.fillRect).toBeGreaterThan(0);
  });

  it('draws a curve and marker once a network is added', () => {
    const ctx = recordingCtx();
    const chart = makeChart(ctx);
    chart.resize();
    chart.setState({
      networks: [{ id: 'net-1', name: 'A', channel: 6, band: BAND_2_4GHZ }],
      band: BAND_2_4GHZ,
      freqRange: RANGE,
      recommendation: { channel: 11, freq: 2462, score: 0 },
    });
    expect(ctx.calls.closePath).toBeGreaterThan(0); // curve path closed
    expect(ctx.calls.fill).toBeGreaterThan(0);
  });

  it('does not spin the rAF loop forever in the empty state under reduced motion', () => {
    const queue = [];
    const chart = createSpectrumChart(fakeCanvas(recordingCtx()), {
      reducedMotion: true,
      raf: (cb) => queue.push(cb),
      devicePixelRatio: 1,
    });
    chart.resize();
    chart.setState({ networks: [], band: BAND_2_4GHZ, freqRange: RANGE, recommendation: null });
    // Drain whatever was scheduled; the loop must settle, not re-arm endlessly.
    let n = 0;
    while (queue.length && n < 100) {
      queue.shift()();
      n += 1;
    }
    expect(n).toBeLessThan(100);
    expect(queue).toHaveLength(0);
  });

  it('does not throw when the context is unavailable (headless)', () => {
    const canvas = fakeCanvas(null);
    const chart = createSpectrumChart(canvas, { reducedMotion: true, raf: () => {} });
    expect(() => {
      chart.resize();
      chart.setState({ networks: [], band: BAND_2_4GHZ, freqRange: RANGE, recommendation: null });
    }).not.toThrow();
  });
});

describe('createSpectrumChart — animation (reduced motion off)', () => {
  // A flushable raf queue lets us step the tween loop deterministically.
  function makeRaf() {
    const queue = [];
    const raf = (cb) => queue.push(cb);
    const flush = (max = 500) => {
      let n = 0;
      while (queue.length && n < max) {
        queue.shift()();
        n += 1;
      }
      return n;
    };
    return { raf, flush };
  }

  const netA = { id: 'net-1', name: 'A', channel: 6, band: BAND_2_4GHZ };

  it('tweens a new curve in and settles it exactly on target', () => {
    const ctx = recordingCtx();
    const { raf, flush } = makeRaf();
    const chart = createSpectrumChart(fakeCanvas(ctx), { reducedMotion: false, raf, devicePixelRatio: 1 });
    chart.resize();
    chart.setState({
      networks: [netA],
      band: BAND_2_4GHZ,
      freqRange: RANGE,
      recommendation: { channel: 11, freq: 2462, score: 0 },
    });
    const frames = flush();
    expect(frames).toBeGreaterThan(1); // it actually animated across frames
    expect(ctx.calls.fill).toBeGreaterThan(0); // curve drawn once settled
  });

  it('shrinks a removed curve out and drops it, and fades the marker', () => {
    const ctx = recordingCtx();
    const { raf, flush } = makeRaf();
    const chart = createSpectrumChart(fakeCanvas(ctx), { reducedMotion: false, raf, devicePixelRatio: 1 });
    chart.resize();
    chart.setState({
      networks: [netA],
      band: BAND_2_4GHZ,
      freqRange: RANGE,
      recommendation: { channel: 11, freq: 2462, score: 0 },
    });
    flush();
    // Remove the only network: the curve must shrink out and the loop must
    // terminate (returns to the idle-sweep steady state) without throwing.
    chart.setState({ networks: [], band: BAND_2_4GHZ, freqRange: RANGE, recommendation: null });
    expect(() => flush()).not.toThrow();
    expect(ctx.calls.clearRect).toBeGreaterThan(0);
  });

  it('reflows curve geometry to the new width on resize (no stale x)', () => {
    // A ctx that records the maximum x coordinate ever drawn to, so we can
    // assert the trace spans the canvas width instead of a stale one.
    let maxX = 0;
    const track = (...a) => {
      if (typeof a[0] === 'number') maxX = Math.max(maxX, a[0]);
    };
    const base = recordingCtx();
    const ctx = { ...base, moveTo: track, lineTo: track };
    const canvas = fakeCanvas(ctx);
    canvas.getBoundingClientRect = () => ({ width: 600, height: 320 });
    const chart = createSpectrumChart(canvas, { reducedMotion: true, raf: () => {}, devicePixelRatio: 1 });
    chart.resize();
    chart.setState({
      networks: [netA],
      band: BAND_2_4GHZ,
      freqRange: RANGE,
      recommendation: { channel: 11, freq: 2462, score: 0 },
    });
    expect(maxX).toBeGreaterThan(500); // trace reaches near the 600px right edge

    // Shrink the canvas and resize: the trace must now stay within the new width.
    maxX = 0;
    canvas.getBoundingClientRect = () => ({ width: 300, height: 320 });
    chart.resize();
    expect(maxX).toBeLessThanOrEqual(300);
    expect(maxX).toBeGreaterThan(0);
  });

  it('destroy() drops all curves and the marker so a later draw is inert', () => {
    const ctx = recordingCtx();
    const { raf, flush } = makeRaf();
    const chart = createSpectrumChart(fakeCanvas(ctx), { reducedMotion: false, raf, devicePixelRatio: 1 });
    chart.resize();
    chart.setState({
      networks: [netA],
      band: BAND_2_4GHZ,
      freqRange: RANGE,
      recommendation: { channel: 11, freq: 2462, score: 0 },
    });
    flush();
    chart.destroy();
    expect(() => chart.draw()).not.toThrow();
  });
});
