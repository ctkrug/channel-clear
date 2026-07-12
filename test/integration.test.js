import { afterEach, describe, expect, it } from 'vitest';
import { mountApp } from '../src/ui/app.js';

// End-to-end wiring check: mount the app with the REAL spectrum-chart
// controller (not a fake) so the app -> chart setState seam is exercised. A
// full recording 2D context stands in for the canvas backend jsdom lacks.
function installCanvasStub() {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function stub() {
    const noop = () => {};
    return {
      setTransform: noop,
      clearRect: noop,
      save: noop,
      restore: noop,
      beginPath: noop,
      moveTo: noop,
      lineTo: noop,
      closePath: noop,
      arcTo: noop,
      stroke: noop,
      fill: noop,
      fillRect: noop,
      fillText: noop,
      setLineDash: noop,
      measureText: () => ({ width: 24 }),
      createLinearGradient: () => ({ addColorStop: noop }),
    };
  };
  return () => {
    HTMLCanvasElement.prototype.getContext = original;
  };
}

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

let restore;
afterEach(() => restore && restore());

function mount(overrides = {}) {
  restore = installCanvasStub();
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector('#app');
  mountApp(root, {
    storage: memoryStorage(),
    location: { search: '', origin: 'https://x.test', pathname: '/channel-clear/' },
    window: { addEventListener() {}, removeEventListener() {} },
    reducedMotion: true, // settle synchronously
    raf: () => {}, // no idle-sweep loop
    devicePixelRatio: 1,
    ...overrides,
  });
  return root;
}

function addNetwork(root, name, channel) {
  root.querySelector('#network-name').value = name;
  root.querySelector('#network-channel').value = String(channel);
  root.querySelector('#add-network-form').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true })
  );
}

describe('app + real chart integration', () => {
  it('mounts, adds, removes, and switches bands without throwing', () => {
    const root = mount();
    expect(() => {
      addNetwork(root, 'A', 1);
      addNetwork(root, 'B', 6);
      const id = root.querySelector('.net-item').dataset.id;
      root.querySelector(`[data-remove="${id}"]`).click();
      root.querySelector('[data-band="5GHz"]').click();
      addNetwork(root, 'C', 36);
      root.querySelector('[data-band="2.4GHz"]').click();
    }).not.toThrow();
    // Back on 2.4GHz the surviving network is still there.
    expect(root.querySelectorAll('#network-list li')).toHaveLength(1);
  });

  it('installs a code-generated SVG favicon (not the default globe)', () => {
    mount();
    const link = document.querySelector('link[rel="icon"]');
    expect(link).not.toBeNull();
    expect(link.href).toContain('data:image/svg+xml');
  });

  it('persists networks across a remount from the same storage', () => {
    const storage = memoryStorage();
    const first = mount({ storage });
    addNetwork(first, 'Persisted', 11);
    restore();

    const second = mount({ storage });
    const items = second.querySelectorAll('#network-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Persisted');
  });
});
