import { CHANNEL_WIDTH_MHZ, bandForChannel, centerFrequency } from './channels.js';

// Models each network as a raised-cosine-ish energy curve centered on its
// channel, tapering to ~0 at 2x its half-width. This approximates the real
// spectral mask shape better than a flat "on/off" overlap window, and is
// what lets two channels 4 apart still show partial (not zero) interference.
function energyAt(freqMHz, centerMHz, widthMHz) {
  const halfWidth = widthMHz / 2;
  const distance = Math.abs(freqMHz - centerMHz);
  const falloffEdge = widthMHz; // energy reaches ~0 at 2x half-width
  if (distance >= falloffEdge) return 0;
  if (distance <= halfWidth) return 1;
  const t = (distance - halfWidth) / (falloffEdge - halfWidth);
  return 0.5 * (1 + Math.cos(t * Math.PI)); // smooth cosine taper to 0
}

// Sample a network's interference curve across a frequency range, used
// directly by the spectrum chart to draw each network's overlap shape.
export function sampleCurve(network, freqRangeMHz, stepMHz = 1) {
  const band = bandForChannel(network.channel);
  const center = centerFrequency(band, network.channel);
  const width = CHANNEL_WIDTH_MHZ[band];
  const points = [];
  for (let f = freqRangeMHz.min; f <= freqRangeMHz.max; f += stepMHz) {
    points.push({ freq: f, energy: energyAt(f, center, width) });
  }
  return points;
}

// Interference contribution one network imposes on a candidate channel,
// as the peak overlap of their two energy curves (0 = no overlap, 1 = same
// channel). Using peak rather than integral keeps the score intuitive:
// a fully co-channel neighbor is "1 unit" of congestion regardless of width.
export function interferenceBetween(candidateBand, candidateChannel, network) {
  const networkBand = bandForChannel(network.channel);
  if (networkBand !== candidateBand) return 0; // different bands never interact

  const candidateCenter = centerFrequency(candidateBand, candidateChannel);
  const networkCenter = centerFrequency(networkBand, network.channel);
  const width = CHANNEL_WIDTH_MHZ[candidateBand];

  // Peak overlap of the two equal-width curves is exactly the energy one curve
  // contributes at the other's center — reuse the single curve model so the two
  // can never drift apart.
  return energyAt(candidateCenter, networkCenter, width);
}

// Total congestion score for a candidate channel: the sum of interference
// from every neighboring network. Lower is better; 0 means a fully clear
// channel.
export function congestionScore(candidateBand, candidateChannel, networks) {
  return networks.reduce(
    (total, network) => total + interferenceBetween(candidateBand, candidateChannel, network),
    0
  );
}

// Ranks every channel in a band by congestion score (ascending) and returns
// the best (least congested) one. Ties break toward the lowest channel
// number for a deterministic, explainable result.
export function leastCongestedChannel(band, candidateChannels, networks) {
  const scored = candidateChannels.map((channel) => ({
    channel,
    score: congestionScore(band, channel, networks),
  }));
  scored.sort((a, b) => a.score - b.score || a.channel - b.channel);
  return scored[0];
}
