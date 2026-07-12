import { describe, expect, it } from 'vitest';
import {
  channelTicks,
  drawCurve,
  drawGrid,
  drawMarker,
  freqToX,
} from '../src/chart/render.js';
import { BAND_2_4GHZ, BAND_5GHZ } from '../src/wifi/channels.js';

// A recording 2D-context stand-in: counts calls so tests assert on drawing
// behavior without a real canvas backend.
function recordingCtx() {
  const calls = {};
  const rec = (name) =>
    function (...args) {
      calls[name] = (calls[name] || 0) + 1;
      calls[`${name}:last`] = args;
    };
  return {
    calls,
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
  };
}

describe('freqToX', () => {
  it('maps the range endpoints to 0 and width', () => {
    const range = { min: 2400, max: 2500 };
    expect(freqToX(2400, range, 800)).toBe(0);
    expect(freqToX(2500, range, 800)).toBe(800);
    expect(freqToX(2450, range, 800)).toBe(400);
  });

  it('does not divide by zero for a degenerate range', () => {
    expect(Number.isFinite(freqToX(2400, { min: 2400, max: 2400 }, 800))).toBe(true);
  });
});

describe('channelTicks', () => {
  it('returns 13 ticks for 2.4GHz with channel and frequency', () => {
    const ticks = channelTicks(BAND_2_4GHZ);
    expect(ticks).toHaveLength(13);
    expect(ticks[0]).toEqual({ channel: 1, freq: 2412 });
  });

  it('returns the non-DFS 5GHz ticks', () => {
    const ticks = channelTicks(BAND_5GHZ);
    expect(ticks.map((t) => t.channel)).toContain(36);
    expect(ticks.map((t) => t.channel)).toContain(165);
  });
});

describe('drawCurve', () => {
  it('draws nothing for an empty point list', () => {
    const ctx = recordingCtx();
    drawCurve(ctx, 300, [], '#3ddbff', 1);
    expect(ctx.calls.beginPath).toBeUndefined();
  });

  it('fills and strokes a trace when given points', () => {
    const ctx = recordingCtx();
    const points = [
      { x: 0, energy: 0 },
      { x: 50, energy: 1 },
      { x: 100, energy: 0 },
    ];
    drawCurve(ctx, 300, points, '#3ddbff', 1);
    expect(ctx.calls.fill).toBe(1);
    expect(ctx.calls.stroke).toBe(1);
    expect(ctx.calls.closePath).toBe(1);
  });
});

describe('drawGrid', () => {
  it('draws channel gridlines and horizontal energy lines', () => {
    const ctx = recordingCtx();
    drawGrid(ctx, 800, 300, BAND_2_4GHZ, { min: 2400, max: 2485 });
    // 5 horizontal lines + 13 vertical channel lines -> many strokes.
    expect(ctx.calls.stroke).toBeGreaterThan(10);
    expect(ctx.calls.fillText).toBeGreaterThan(0);
  });
});

describe('drawMarker', () => {
  it('draws the marker line, arrowhead, and label', () => {
    const ctx = recordingCtx();
    drawMarker(ctx, 800, 300, 400, 'CH 11', 1);
    expect(ctx.calls.stroke).toBeGreaterThan(0);
    expect(ctx.calls.fill).toBeGreaterThan(0);
    expect(ctx.calls['fillText:last']).toEqual(['CH 11', expect.any(Number), expect.any(Number)]);
  });
});
