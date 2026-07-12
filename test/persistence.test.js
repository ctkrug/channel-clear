import { describe, expect, it } from 'vitest';
import {
  loadNetworks,
  saveNetworks,
  serializeNetworks,
} from '../src/state/persistence.js';
import { BAND_2_4GHZ, BAND_5GHZ } from '../src/wifi/channels.js';

// A minimal in-memory localStorage stand-in so these tests don't depend on
// jsdom's storage or leak between cases.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

describe('serializeNetworks', () => {
  it('drops id and band, keeping only name and channel', () => {
    const out = serializeNetworks([{ id: 'net-1', name: 'A', channel: 6, band: BAND_2_4GHZ }]);
    expect(out).toEqual([{ name: 'A', channel: 6 }]);
  });
});

describe('save/load round-trip', () => {
  it('restores the same networks with band re-derived', () => {
    const storage = fakeStorage();
    saveNetworks([{ name: 'A', channel: 1 }, { name: 'B', channel: 36 }], storage);
    const loaded = loadNetworks(storage);
    expect(loaded).toEqual([
      { name: 'A', channel: 1, band: BAND_2_4GHZ },
      { name: 'B', channel: 36, band: BAND_5GHZ },
    ]);
  });
});

describe('loadNetworks boundaries', () => {
  it('returns an empty array on a first visit (nothing stored)', () => {
    expect(loadNetworks(fakeStorage())).toEqual([]);
  });

  it('returns an empty array for malformed JSON instead of throwing', () => {
    expect(loadNetworks(fakeStorage({ 'channel-clear:networks:v1': '{not json' }))).toEqual([]);
  });

  it('returns an empty array when the stored value is not an array', () => {
    expect(loadNetworks(fakeStorage({ 'channel-clear:networks:v1': '{"a":1}' }))).toEqual([]);
  });

  it('drops entries with unknown channels or missing names', () => {
    const storage = fakeStorage({
      'channel-clear:networks:v1': JSON.stringify([
        { name: 'Good', channel: 6 },
        { name: 'BadChannel', channel: 999 },
        { channel: 1 },
        { name: 'NoChannel' },
      ]),
    });
    expect(loadNetworks(storage)).toEqual([{ name: 'Good', channel: 6, band: BAND_2_4GHZ }]);
  });

  it('returns an empty array when storage is unavailable', () => {
    expect(loadNetworks(null)).toEqual([]);
  });
});
