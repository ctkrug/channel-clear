import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  decodeNetworks,
  encodeNetworks,
  parseShareParam,
} from '../src/state/share.js';
import { BAND_2_4GHZ, BAND_5GHZ } from '../src/wifi/channels.js';

describe('encode/decode round-trip', () => {
  it('reproduces the same networks with band re-derived', () => {
    const networks = [
      { name: 'HomeNet', channel: 6 },
      { name: 'Neighbor 5G', channel: 149 },
    ];
    const decoded = decodeNetworks(encodeNetworks(networks));
    expect(decoded).toEqual([
      { name: 'HomeNet', channel: 6, band: BAND_2_4GHZ },
      { name: 'Neighbor 5G', channel: 149, band: BAND_5GHZ },
    ]);
  });

  it('preserves names containing the field and pair separators', () => {
    const networks = [{ name: 'net.with~seps', channel: 1 }];
    const decoded = decodeNetworks(encodeNetworks(networks));
    expect(decoded[0].name).toBe('net.with~seps');
    expect(decoded[0].channel).toBe(1);
  });
});

describe('decodeNetworks boundaries', () => {
  it('returns an empty array for an empty or non-string input', () => {
    expect(decodeNetworks('')).toEqual([]);
    expect(decodeNetworks(undefined)).toEqual([]);
  });

  it('drops pairs with an unknown channel', () => {
    expect(decodeNetworks('Good.6~Bad.999')).toEqual([
      { name: 'Good', channel: 6, band: BAND_2_4GHZ },
    ]);
  });

  it('drops pairs with an empty name', () => {
    expect(decodeNetworks('.6')).toEqual([]);
  });

  it('drops pairs with malformed percent-encoding', () => {
    expect(decodeNetworks('%E0%A4%A.6')).toEqual([]);
  });
});

describe('URL helpers', () => {
  it('parses networks out of a location.search string', () => {
    const url = buildShareUrl('https://example.com/channel-clear/', [
      { name: 'A', channel: 11 },
    ]);
    const search = url.slice(url.indexOf('?'));
    expect(parseShareParam(search)).toEqual([
      { name: 'A', channel: 11, band: BAND_2_4GHZ },
    ]);
  });

  it('returns an empty array when the param is absent', () => {
    expect(parseShareParam('?other=1')).toEqual([]);
  });
});
