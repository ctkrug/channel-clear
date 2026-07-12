import { describe, it } from 'vitest';
import fc from 'fast-check';
import { BAND_2_4GHZ, BAND_5GHZ, channelsForBand } from '../src/wifi/channels.js';
import {
  congestionScore,
  interferenceBetween,
  leastCongestedChannel,
} from '../src/wifi/overlap.js';

// Property-based coverage of the overlap math: rather than a handful of chosen
// pairs, assert the invariants that must hold for EVERY channel combination.

const CH_2_4 = channelsForBand(BAND_2_4GHZ);
const CH_5 = channelsForBand(BAND_5GHZ);
const band2_4 = fc.constantFrom(...CH_2_4);
const band5 = fc.constantFrom(...CH_5);

describe('interferenceBetween — invariants', () => {
  it('is always within [0, 1] for any same-band pair', () => {
    fc.assert(
      fc.property(band2_4, band2_4, (a, b) => {
        const v = interferenceBetween(BAND_2_4GHZ, a, { channel: b });
        return v >= 0 && v <= 1;
      })
    );
  });

  it('is exactly 1 for a co-channel neighbor on every channel', () => {
    fc.assert(
      fc.property(fc.oneof(band2_4, band5), (ch) => {
        const band = CH_2_4.includes(ch) ? BAND_2_4GHZ : BAND_5GHZ;
        return interferenceBetween(band, ch, { channel: ch }) === 1;
      })
    );
  });

  it('is symmetric: swapping candidate and neighbor channel gives the same value', () => {
    fc.assert(
      fc.property(band2_4, band2_4, (a, b) => {
        const ab = interferenceBetween(BAND_2_4GHZ, a, { channel: b });
        const ba = interferenceBetween(BAND_2_4GHZ, b, { channel: a });
        return Math.abs(ab - ba) < 1e-12;
      })
    );
  });

  it('never lets a 2.4GHz network interfere with a 5GHz candidate', () => {
    fc.assert(
      fc.property(band5, band2_4, (candidate, neighbor) => {
        return interferenceBetween(BAND_5GHZ, candidate, { channel: neighbor }) === 0;
      })
    );
  });
});

describe('congestionScore — invariants', () => {
  it('equals the neighbor count when every neighbor is co-channel', () => {
    fc.assert(
      fc.property(band2_4, fc.integer({ min: 0, max: 20 }), (ch, count) => {
        const neighbors = Array.from({ length: count }, () => ({ channel: ch }));
        return Math.abs(congestionScore(BAND_2_4GHZ, ch, neighbors) - count) < 1e-9;
      })
    );
  });

  it('is monotonic: adding a neighbor never lowers the score', () => {
    fc.assert(
      fc.property(band2_4, fc.array(band2_4, { maxLength: 12 }), band2_4, (cand, chans, extra) => {
        const base = congestionScore(BAND_2_4GHZ, cand, chans.map((c) => ({ channel: c })));
        const more = congestionScore(
          BAND_2_4GHZ,
          cand,
          [...chans, extra].map((c) => ({ channel: c }))
        );
        return more >= base - 1e-9;
      })
    );
  });
});

describe('leastCongestedChannel — invariants', () => {
  it('returns a candidate channel whose score is the global minimum, ties low', () => {
    fc.assert(
      fc.property(fc.array(band2_4, { maxLength: 15 }), (chans) => {
        const networks = chans.map((c) => ({ channel: c }));
        const result = leastCongestedChannel(BAND_2_4GHZ, CH_2_4, networks);
        const scores = CH_2_4.map((c) => congestionScore(BAND_2_4GHZ, c, networks));
        const min = Math.min(...scores);
        // result is the lowest-numbered channel achieving the minimum score
        const expected = CH_2_4.find((c, i) => scores[i] === min);
        return (
          CH_2_4.includes(result.channel) &&
          Math.abs(result.score - min) < 1e-9 &&
          result.channel === expected
        );
      })
    );
  });
});
