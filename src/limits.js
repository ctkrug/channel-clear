// Domain-derived input limits, enforced by the store so no entry path — the
// form, a shared link, or hand-edited localStorage — can build a pathological
// or misleading network list.

// IEEE 802.11 caps an SSID at 32 octets; a longer "name" isn't a real network,
// so it's truncated rather than trusted or rejected outright.
export const MAX_SSID_LENGTH = 32;

// A dense apartment sees a few dozen networks. Cap well above that so a crafted
// share URL or corrupt storage can't spawn thousands of curves and wedge the
// render loop, while never clipping a realistic real-world scan.
export const MAX_NETWORKS = 128;
