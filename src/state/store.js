import { bandForChannel } from '../wifi/channels.js';
import { MAX_NETWORKS, MAX_SSID_LENGTH } from '../limits.js';

// In-memory store of the neighboring networks the user has entered. Holds
// every network across both bands; the UI decides which band to display.
// Kept framework-free: a tiny observable so the canvas + list + recommendation
// all rerender from one source of truth on any mutation.

let idCounter = 0;

function nextId() {
  idCounter += 1;
  return `net-${idCounter}`;
}

// Normalizes a raw entry into a stored network. `band` is derived from the
// channel so the two can never disagree, and every entry gets a unique id so
// networks with duplicate SSIDs (common in apartments) stay individually
// addressable.
function normalize({ name, channel }) {
  const ch = Number(channel);
  return {
    id: nextId(),
    name: String(name).slice(0, MAX_SSID_LENGTH),
    channel: ch,
    band: bandForChannel(ch),
  };
}

export function createStore(initialNetworks = []) {
  let networks = initialNetworks.slice(0, MAX_NETWORKS).map(normalize);
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(networks);
  }

  return {
    getNetworks() {
      return networks.slice();
    },

    networksForBand(band) {
      return networks.filter((n) => n.band === band);
    },

    add(entry) {
      if (networks.length >= MAX_NETWORKS) return null;
      const network = normalize(entry);
      networks = [...networks, network];
      emit();
      return network;
    },

    remove(id) {
      const before = networks.length;
      networks = networks.filter((n) => n.id !== id);
      if (networks.length !== before) emit();
    },

    replaceAll(entries) {
      networks = entries.slice(0, MAX_NETWORKS).map(normalize);
      emit();
    },

    clear() {
      if (networks.length === 0) return;
      networks = [];
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
