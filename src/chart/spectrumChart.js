import { sampleCurve } from '../wifi/overlap.js';

// Renders the live spectrum chart: one filled curve per network plus a
// marker for the recommended clear channel. Kept framework-free — this
// canvas is the product, so it's drawn directly rather than through a
// charting library.
export function drawSpectrum(ctx, width, height, { networks, freqRange, best, colors }) {
  ctx.clearRect(0, 0, width, height);

  const toX = (freq) =>
    ((freq - freqRange.min) / (freqRange.max - freqRange.min)) * width;
  const toY = (energy) => height - energy * height;

  networks.forEach((network, i) => {
    const points = sampleCurve(network, freqRange);
    if (points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(toX(points[0].freq), height);
    points.forEach((p) => ctx.lineTo(toX(p.freq), toY(p.energy)));
    ctx.lineTo(toX(points[points.length - 1].freq), height);
    ctx.closePath();

    const color = colors?.[i % (colors?.length || 1)] ?? '#4f8fff';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  if (best) {
    const x = toX(best.freqMHz);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
}
