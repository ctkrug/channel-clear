import { channelsForBand, bandForChannel } from '../wifi/channels.js';

// Persists the entered network list to localStorage so a reload restores the
// same spectrum. Only {name, channel} is stored — band is re-derived on load,
// keeping the payload small and impossible to store inconsistently.

const STORAGE_KEY = 'channel-clear:networks:v1';

const VALID_CHANNELS = new Set([
  ...channelsForBand('2.4GHz'),
  ...channelsForBand('5GHz'),
]);

// A stored entry is only accepted if it has a string name and a channel we
// actually know how to plot. Anything else (hand-edited storage, an old schema)
// is dropped rather than crashing the app on load.
function isValidEntry(entry) {
  return (
    entry &&
    typeof entry.name === 'string' &&
    Number.isFinite(entry.channel) &&
    VALID_CHANNELS.has(entry.channel)
  );
}

export function serializeNetworks(networks) {
  return networks.map((n) => ({ name: n.name, channel: n.channel }));
}

export function saveNetworks(networks, storage = safeStorage()) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(serializeNetworks(networks)));
  } catch {
    // Quota errors / private-mode restrictions are non-fatal: the app still
    // works this session, it just won't persist.
  }
}

export function loadNetworks(storage = safeStorage()) {
  if (!storage) return [];
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidEntry).map((entry) => ({
    name: entry.name,
    channel: entry.channel,
    band: bandForChannel(entry.channel),
  }));
}

// Guards against SSR / test environments and browsers where accessing
// localStorage throws (e.g. cookies fully blocked).
function safeStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}
