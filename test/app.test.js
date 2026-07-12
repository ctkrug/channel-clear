import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountApp } from '../src/ui/app.js';

// jsdom has no canvas 2D backend, so getContext('2d') returns null by
// default. Stub it with a no-op recorder since these tests only assert on
// the surrounding DOM, not pixel output.
function stubCanvasContext() {
  const noop = vi.fn();
  HTMLCanvasElement.prototype.getContext = () => ({
    clearRect: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
  });
}

describe('mountApp', () => {
  let root;

  beforeEach(() => {
    stubCanvasContext();
    document.body.innerHTML = '<div id="app"></div>';
    root = document.querySelector('#app');
    mountApp(root);
  });

  it('renders the add-network form and an empty-state recommendation', () => {
    expect(root.querySelector('#add-network-form')).not.toBeNull();
    expect(root.querySelector('#recommendation').textContent).toMatch(/add a neighboring/i);
  });

  it('adds a network to the list on form submit', () => {
    root.querySelector('#network-name').value = 'MyNeighborsWifi';
    root.querySelector('#network-channel').value = '6';
    root.querySelector('#add-network-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const items = root.querySelectorAll('#network-list li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('MyNeighborsWifi');
  });

  it('updates the recommendation once a network is added', () => {
    root.querySelector('#network-name').value = 'Neighbor';
    root.querySelector('#network-channel').value = '6';
    root.querySelector('#add-network-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    expect(root.querySelector('#recommendation').textContent).toMatch(/recommended channel/i);
  });
});
