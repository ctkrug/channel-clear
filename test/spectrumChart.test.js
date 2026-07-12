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

  it('does not throw when the context is unavailable (headless)', () => {
    const canvas = fakeCanvas(null);
    const chart = createSpectrumChart(canvas, { reducedMotion: true, raf: () => {} });
    expect(() => {
      chart.resize();
      chart.setState({ networks: [], band: BAND_2_4GHZ, freqRange: RANGE, recommendation: null });
    }).not.toThrow();
  });
});
