import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../src/ui/app.js';
import { MAX_NETWORKS } from '../src/limits.js';

// A fake spectrum chart: records the last state it was told to render so tests
// can assert on the data flow without a real canvas backend.
function fakeChart() {
  return {
    states: [],
    resize: vi.fn(),
    setState(state) {
      this.states.push(state);
    },
    get last() {
      return this.states[this.states.length - 1];
    },
  };
}

// Non-persisting storage stub so cases stay isolated.
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

function setup(overrides = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.querySelector('#app');
  const chart = fakeChart();
  const app = mountApp(root, {
    chart,
    storage: memoryStorage(),
    location: { search: '', origin: 'https://x.test', pathname: '/channel-clear/' },
    window: { addEventListener() {}, removeEventListener() {} },
    ...overrides,
  });
  return { root, chart, app };
}

function addNetwork(root, name, channel) {
  root.querySelector('#network-name').value = name;
  root.querySelector('#network-channel').value = String(channel);
  root.querySelector('#add-network-form').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true })
  );
}

describe('mountApp — form and list', () => {
  let root;
  let chart;
  beforeEach(() => {
    ({ root, chart } = setup());
  });

  it('renders the add-network form and empty-state recommendation', () => {
    expect(root.querySelector('#add-network-form')).not.toBeNull();
    expect(root.querySelector('#recommendation').dataset.state).toBe('empty');
  });

  it('adds a network to the list on submit and clears the name field', () => {
    addNetwork(root, 'Apt 4B', 6);
    const items = root.querySelectorAll('#network-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Apt 4B');
    expect(root.querySelector('#network-name').value).toBe('');
  });

  it('updates the recommendation once networks are added', () => {
    addNetwork(root, 'A', 1);
    addNetwork(root, 'B', 6);
    // Neighbors on 1 and 6 -> channel 11 is the clear gap.
    expect(root.querySelector('#rec-channel').textContent).toBe('CH 11');
    expect(chart.last.recommendation.channel).toBe(11);
  });

  it('announces a wide-open channel when the recommendation is fully clear', () => {
    addNetwork(root, 'A', 1); // leaves 11 with a zero overlap score
    expect(root.querySelector('#recommendation').dataset.state).toBe('clear');
    expect(root.querySelector('#rec-detail').textContent).toMatch(/wide open/i);
  });

  it('reports the overlap score when no channel is fully clear', () => {
    // Crowd 1/6/11 so every candidate carries some congestion.
    addNetwork(root, 'A', 1);
    addNetwork(root, 'B', 6);
    addNetwork(root, 'C', 11);
    expect(root.querySelector('#recommendation').dataset.state).toBe('busy');
    expect(root.querySelector('#rec-detail').textContent).toMatch(/overlap score/i);
  });

  it('escapes HTML in a network name so a crafted SSID cannot inject markup', () => {
    addNetwork(root, '<img src=x onerror=alert(1)>', 6);
    const item = root.querySelector('.net-item');
    // Rendered as text, not a live element.
    expect(item.querySelector('img')).toBeNull();
    expect(item.innerHTML).toContain('&lt;img');
    expect(item.querySelector('.net-name').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps a unicode/emoji SSID intact through add and render', () => {
    addNetwork(root, 'café 📶', 6);
    expect(root.querySelector('.net-name').textContent).toBe('café 📶');
  });
});

describe('mountApp — validation', () => {
  let root;
  beforeEach(() => {
    ({ root } = setup());
  });

  it('shows an inline error and adds nothing for an empty name', () => {
    addNetwork(root, '   ', 6);
    expect(root.querySelector('#form-error').hidden).toBe(false);
    expect(root.querySelectorAll('#network-list li')).toHaveLength(0);
  });

  it('caps the network-name input at the 32-char SSID maximum', () => {
    expect(root.querySelector('#network-name').getAttribute('maxlength')).toBe('32');
  });

  it('shows an inline error when no channel is selected', () => {
    root.querySelector('#network-name').value = 'A';
    root.querySelector('#network-channel').value = '';
    root.querySelector('#add-network-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(root.querySelector('#form-error').hidden).toBe(false);
    expect(root.querySelectorAll('#network-list li')).toHaveLength(0);
  });

  it('shows a full-list error instead of silently dropping the add at the cap', () => {
    const search =
      '?n=' + Array.from({ length: MAX_NETWORKS }, (_, i) => `n${i}.6`).join('~');
    const { root } = setup({
      location: { search, origin: 'https://x.test', pathname: '/channel-clear/' },
    });
    expect(root.querySelectorAll('#network-list li')).toHaveLength(MAX_NETWORKS);
    addNetwork(root, 'over', 6);
    expect(root.querySelector('#form-error').hidden).toBe(false);
    expect(root.querySelector('#form-error').textContent).toContain('full');
    expect(root.querySelectorAll('#network-list li')).toHaveLength(MAX_NETWORKS);
  });
});

describe('mountApp — remove and band', () => {
  it('removes only the clicked network', () => {
    const { root } = setup();
    addNetwork(root, 'Keep', 1);
    addNetwork(root, 'Drop', 6);
    const dropId = [...root.querySelectorAll('.net-item')].find((li) =>
      li.textContent.includes('Drop')
    ).dataset.id;
    root.querySelector(`[data-remove="${dropId}"]`).click();
    const items = root.querySelectorAll('#network-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Keep');
  });

  it('narrows the channel dropdown to non-DFS 5GHz channels on band switch', () => {
    const { root } = setup();
    root.querySelector('[data-band="5GHz"]').click();
    const values = [...root.querySelectorAll('#network-channel option')]
      .map((o) => o.value)
      .filter(Boolean)
      .map(Number);
    expect(values).toEqual([36, 40, 44, 48, 149, 153, 157, 161, 165]);
  });

  it('clears every network and returns the recommendation to its empty state', () => {
    const { root, chart } = setup();
    addNetwork(root, 'A', 1);
    addNetwork(root, 'B', 6);
    expect(root.querySelectorAll('#network-list li')).toHaveLength(2);
    root.querySelector('#clear-all').click();
    expect(root.querySelectorAll('#network-list li')).toHaveLength(0);
    expect(root.querySelector('#recommendation').dataset.state).toBe('empty');
    expect(chart.last.networks).toHaveLength(0);
    expect(chart.last.recommendation).toBeNull();
  });

  it('preserves other-band networks in state when switching bands', () => {
    const { root, chart } = setup();
    addNetwork(root, 'TwoFour', 6);
    root.querySelector('[data-band="5GHz"]').click();
    // 5GHz view is empty...
    expect(root.querySelectorAll('#network-list li')).toHaveLength(0);
    expect(chart.last.recommendation).toBeNull();
    // ...but switching back restores the 2.4GHz network.
    root.querySelector('[data-band="2.4GHz"]').click();
    expect(root.querySelectorAll('#network-list li')).toHaveLength(1);
  });
});

describe('mountApp — persistence and share', () => {
  it('restores networks from a share link over localStorage', () => {
    const { root } = setup({
      location: { search: '?n=Shared.6', origin: 'https://x.test', pathname: '/channel-clear/' },
    });
    const items = root.querySelectorAll('#network-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('Shared');
  });

  it('copies a shareable link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    const { root } = setup({ clipboard: { writeText } });
    addNetwork(root, 'A', 6);
    root.querySelector('#copy-link').click();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain('?n=');
  });

  it('shows "Copy failed" and re-enables the button when the clipboard rejects', async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      const { root } = setup({ clipboard: { writeText } });
      addNetwork(root, 'A', 6);
      const btn = root.querySelector('#copy-link');
      btn.click();
      await vi.waitFor(() => expect(btn.textContent).toBe('Copy failed'));
      expect(btn.disabled).toBe(true);
      vi.advanceTimersByTime(1400);
      expect(btn.textContent).toBe('Copy link');
      expect(btn.disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports "Copy failed" when no clipboard API is available at all', async () => {
    const { root } = setup({ clipboard: null });
    addNetwork(root, 'A', 6);
    const btn = root.querySelector('#copy-link');
    btn.click();
    await vi.waitFor(() => expect(btn.textContent).toBe('Copy failed'));
  });
});

describe('mountApp — window wiring', () => {
  it('resizes the chart when the window fires a resize event', () => {
    const handlers = {};
    const chart = fakeChart();
    document.body.innerHTML = '<div id="app"></div>';
    mountApp(document.querySelector('#app'), {
      chart,
      storage: memoryStorage(),
      location: { search: '', origin: 'https://x.test', pathname: '/channel-clear/' },
      window: {
        addEventListener: (type, fn) => (handlers[type] = fn),
        removeEventListener: () => {},
      },
    });
    chart.resize.mockClear();
    handlers.resize();
    expect(chart.resize).toHaveBeenCalledOnce();
  });

  it('removes its resize listener on destroy', () => {
    const removed = [];
    document.body.innerHTML = '<div id="app"></div>';
    const app = mountApp(document.querySelector('#app'), {
      chart: fakeChart(),
      storage: memoryStorage(),
      location: { search: '', origin: 'https://x.test', pathname: '/channel-clear/' },
      window: {
        addEventListener: () => {},
        removeEventListener: (type) => removed.push(type),
      },
    });
    app.destroy();
    expect(removed).toContain('resize');
  });
});
