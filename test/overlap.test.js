import { describe, expect, it } from 'vitest';
import { BAND_2_4GHZ, BAND_5GHZ } from '../src/wifi/channels.js';
import {
  congestionScore,
  interferenceBetween,
  leastCongestedChannel,
} from '../src/wifi/overlap.js';

describe('interferenceBetween', () => {
  it('is 1 (full overlap) for a co-channel neighbor', () => {
    const network = { channel: 6 };
    expect(interferenceBetween(BAND_2_4GHZ, 6, network)).toBe(1);
  });

  it('is 0 for 2.4GHz channels far enough apart (1 vs 11)', () => {
    const network = { channel: 1 };
    expect(interferenceBetween(BAND_2_4GHZ, 11, network)).toBe(0);
  });

  it('reports zero interference between each of the non-overlapping trio 1/6/11', () => {
    // The classic US non-overlapping set: no pair should bleed into another.
    expect(interferenceBetween(BAND_2_4GHZ, 6, { channel: 1 })).toBe(0);
    expect(interferenceBetween(BAND_2_4GHZ, 11, { channel: 6 })).toBe(0);
    expect(interferenceBetween(BAND_2_4GHZ, 1, { channel: 11 })).toBe(0);
  });

  it('is 1 for two networks sharing the exact same 5GHz channel', () => {
    expect(interferenceBetween(BAND_5GHZ, 36, { channel: 36 })).toBe(1);
  });

  it('is partial but nonzero for channels a few numbers apart', () => {
    const network = { channel: 6 };
    const value = interferenceBetween(BAND_2_4GHZ, 3, network);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1);
  });

  it('never crosses bands', () => {
    const network = { channel: 6 }; // 2.4GHz
    expect(interferenceBetween(BAND_5GHZ, 36, network)).toBe(0);
  });
});

describe('congestionScore', () => {
  it('is 0 with no neighboring networks', () => {
    expect(congestionScore(BAND_2_4GHZ, 6, [])).toBe(0);
  });

  it('sums interference across multiple neighbors', () => {
    const networks = [{ channel: 6 }, { channel: 6 }];
    expect(congestionScore(BAND_2_4GHZ, 6, networks)).toBe(2);
  });
});

describe('leastCongestedChannel', () => {
  it('picks the one clear channel among busy neighbors (the wow moment)', () => {
    // Networks crowd channels 1 and 6, leaving 11 as the clear gap.
    const networks = [
      { channel: 1 },
      { channel: 1 },
      { channel: 6 },
    ];
    const result = leastCongestedChannel(BAND_2_4GHZ, [1, 6, 11], networks);
    expect(result.channel).toBe(11);
    expect(result.score).toBe(0);
  });

  it('breaks ties toward the lowest channel number', () => {
    const result = leastCongestedChannel(BAND_2_4GHZ, [1, 6, 11], []);
    expect(result.channel).toBe(1);
    expect(result.score).toBe(0);
  });

  it('picks the least-bad option when every channel has some congestion', () => {
    const networks = [{ channel: 1 }, { channel: 6 }, { channel: 11 }];
    const result = leastCongestedChannel(BAND_2_4GHZ, [1, 6, 11], networks);
    expect(result.score).toBe(1);
  });
});
