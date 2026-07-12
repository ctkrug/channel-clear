import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/state/store.js';
import { BAND_2_4GHZ, BAND_5GHZ } from '../src/wifi/channels.js';

describe('createStore', () => {
  it('starts empty by default', () => {
    expect(createStore().getNetworks()).toEqual([]);
  });

  it('derives band from channel and assigns a unique id on add', () => {
    const store = createStore();
    const a = store.add({ name: 'A', channel: 6 });
    const b = store.add({ name: 'B', channel: 36 });

    expect(a.band).toBe(BAND_2_4GHZ);
    expect(b.band).toBe(BAND_5GHZ);
    expect(a.id).not.toBe(b.id);
    expect(store.getNetworks()).toHaveLength(2);
  });

  it('keeps duplicate SSIDs as distinct entries', () => {
    const store = createStore();
    const first = store.add({ name: 'xfinitywifi', channel: 1 });
    const second = store.add({ name: 'xfinitywifi', channel: 1 });
    expect(first.id).not.toBe(second.id);
    expect(store.getNetworks()).toHaveLength(2);
  });

  it('removes only the network with the matching id', () => {
    const store = createStore();
    const a = store.add({ name: 'A', channel: 1 });
    const b = store.add({ name: 'B', channel: 6 });
    store.remove(a.id);
    const remaining = store.getNetworks();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  it('filters networks by band', () => {
    const store = createStore();
    store.add({ name: 'A', channel: 1 });
    store.add({ name: 'B', channel: 36 });
    expect(store.networksForBand(BAND_2_4GHZ)).toHaveLength(1);
    expect(store.networksForBand(BAND_5GHZ)).toHaveLength(1);
  });

  it('notifies subscribers on add and remove, but not on a no-op remove', () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const a = store.add({ name: 'A', channel: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    store.remove('does-not-exist');
    expect(listener).toHaveBeenCalledTimes(1);

    store.remove(a.id);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying after unsubscribe', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.add({ name: 'A', channel: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns a copy from getNetworks so external mutation cannot corrupt state', () => {
    const store = createStore();
    store.add({ name: 'A', channel: 1 });
    store.getNetworks().push({ bogus: true });
    expect(store.getNetworks()).toHaveLength(1);
  });
});
