import { describe, expect, it } from 'vitest';
import {
  BAND_2_4GHZ,
  BAND_5GHZ,
  bandForChannel,
  centerFrequency,
  channelsForBand,
} from '../src/wifi/channels.js';

describe('bandForChannel', () => {
  it('identifies 2.4GHz channels', () => {
    expect(bandForChannel(1)).toBe(BAND_2_4GHZ);
    expect(bandForChannel(11)).toBe(BAND_2_4GHZ);
  });

  it('identifies 5GHz channels', () => {
    expect(bandForChannel(36)).toBe(BAND_5GHZ);
    expect(bandForChannel(161)).toBe(BAND_5GHZ);
  });

  it('treats any non-2.4GHz channel as 5GHz (the fallback band)', () => {
    // bandForChannel is a two-way split; unknown numbers land in 5GHz, where
    // centerFrequency is the gate that actually rejects them.
    expect(bandForChannel(999)).toBe(BAND_5GHZ);
    expect(() => centerFrequency(BAND_5GHZ, 999)).toThrow(RangeError);
  });
});

describe('centerFrequency', () => {
  it('returns the known center frequency for channel 6', () => {
    expect(centerFrequency(BAND_2_4GHZ, 6)).toBe(2437);
  });

  it('throws for an unknown channel', () => {
    expect(() => centerFrequency(BAND_2_4GHZ, 99)).toThrow(RangeError);
  });
});

describe('channelsForBand', () => {
  it('lists all 13 2.4GHz channels', () => {
    expect(channelsForBand(BAND_2_4GHZ)).toHaveLength(13);
  });

  it('lists the non-DFS 5GHz channels', () => {
    expect(channelsForBand(BAND_5GHZ)).toContain(36);
    expect(channelsForBand(BAND_5GHZ)).toContain(161);
  });
});
