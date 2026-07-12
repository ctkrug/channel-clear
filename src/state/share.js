import { channelsForBand, bandForChannel } from '../wifi/channels.js';

// Encodes the current network list into a compact, URL-safe string so a user
// can share their exact spectrum via a link. Format is a `~`-separated list of
// `name.channel` pairs, with the name percent-encoded so separators inside an
// SSID survive the round-trip. Kept human-inspectable rather than base64 so a
// shared URL still hints at what it contains.

export const SHARE_PARAM = 'n';

const PAIR_SEP = '~';
const FIELD_SEP = '.';

const VALID_CHANNELS = new Set([
  ...channelsForBand('2.4GHz'),
  ...channelsForBand('5GHz'),
]);

// encodeURIComponent leaves `.` and `~` unescaped (they're URL-unreserved), so
// escape them explicitly to keep them from colliding with our separators.
function encodeName(name) {
  return encodeURIComponent(name).replace(/\./g, '%2E').replace(/~/g, '%7E');
}

export function encodeNetworks(networks) {
  return networks
    .map((n) => `${encodeName(n.name)}${FIELD_SEP}${n.channel}`)
    .join(PAIR_SEP);
}

export function decodeNetworks(encoded) {
  if (typeof encoded !== 'string' || encoded.length === 0) return [];

  return encoded
    .split(PAIR_SEP)
    .map((pair) => {
      const idx = pair.lastIndexOf(FIELD_SEP);
      if (idx === -1) return null;
      const channel = Number(pair.slice(idx + 1));
      if (!VALID_CHANNELS.has(channel)) return null;
      let name;
      try {
        name = decodeURIComponent(pair.slice(0, idx));
      } catch {
        return null; // malformed percent-encoding
      }
      if (name.length === 0) return null;
      return { name, channel, band: bandForChannel(channel) };
    })
    .filter(Boolean);
}

// Reads the share payload out of a location.search string (e.g. "?n=...").
export function parseShareParam(search) {
  const params = new URLSearchParams(search || '');
  return decodeNetworks(params.get(SHARE_PARAM) ?? '');
}

// Builds a full shareable URL from a base (typically location.origin + pathname)
// and the current networks.
export function buildShareUrl(baseUrl, networks) {
  const params = new URLSearchParams();
  params.set(SHARE_PARAM, encodeNetworks(networks));
  return `${baseUrl}?${params.toString()}`;
}
