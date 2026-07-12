// Wi-Fi channel definitions for 2.4GHz and 5GHz, used to plot overlap curves
// and to bound which channels are legal to recommend.
//
// 2.4GHz channels are spaced 5MHz apart but each occupies ~22MHz, so
// adjacent channels overlap heavily; only 1/6/11 (US) are non-overlapping.
// 5GHz channels are spaced 20MHz apart with no overlap between primary
// 20MHz channels, so congestion there is about shared channels, not bleed.

export const BAND_2_4GHZ = '2.4GHz';
export const BAND_5GHZ = '5GHz';

// { channel: centerFrequencyMHz }
export const CHANNELS_2_4GHZ = Object.fromEntries(
  Array.from({ length: 13 }, (_, i) => {
    const channel = i + 1;
    const centerMHz = 2412 + i * 5;
    return [channel, centerMHz];
  })
);

// Common non-DFS 5GHz 20MHz-wide channels (US-typical UNII-1 + UNII-3).
// DFS channels are omitted since routers rarely default to them and they
// require radar detection most home users can't reason about.
export const CHANNELS_5GHZ = {
  36: 5180,
  40: 5200,
  44: 5220,
  48: 5240,
  149: 5745,
  153: 5765,
  157: 5785,
  161: 5805,
  165: 5825,
};

export const CHANNEL_WIDTH_MHZ = {
  [BAND_2_4GHZ]: 22,
  [BAND_5GHZ]: 20,
};

export function bandForChannel(channel) {
  return channel in CHANNELS_2_4GHZ ? BAND_2_4GHZ : BAND_5GHZ;
}

export function centerFrequency(band, channel) {
  const table = band === BAND_2_4GHZ ? CHANNELS_2_4GHZ : CHANNELS_5GHZ;
  const freq = table[channel];
  if (freq === undefined) {
    throw new RangeError(`Unknown channel ${channel} for band ${band}`);
  }
  return freq;
}

export function channelsForBand(band) {
  const table = band === BAND_2_4GHZ ? CHANNELS_2_4GHZ : CHANNELS_5GHZ;
  return Object.keys(table).map(Number);
}
