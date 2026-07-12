import {
  BAND_2_4GHZ,
  BAND_5GHZ,
  centerFrequency,
  channelsForBand,
} from '../wifi/channels.js';
import { leastCongestedChannel } from '../wifi/overlap.js';
import { createSpectrumChart } from '../chart/spectrumChart.js';
import { createStore } from '../state/store.js';
import { loadNetworks, saveNetworks } from '../state/persistence.js';
import { buildShareUrl, parseShareParam } from '../state/share.js';
import { installFavicon } from './favicon.js';

const FREQ_RANGES = {
  [BAND_2_4GHZ]: { min: 2401, max: 2484 },
  [BAND_5GHZ]: { min: 5170, max: 5835 },
};

const BAND_LABEL = { [BAND_2_4GHZ]: '2.4 GHz', [BAND_5GHZ]: '5 GHz' };

// Mounts the full Channel Clear instrument: a band toggle + add-network form
// on the left rail, and the live spectrum chart as the hero on the right. All
// views rerender from the store, so add/remove/band changes stay consistent.
export function mountApp(root, deps = {}) {
  const store = createStore(initialNetworks(deps));
  let activeBand = BAND_2_4GHZ;
  const chart = deps.chart ?? null;

  installFavicon(deps.document ?? document);

  root.innerHTML = template();

  const els = {
    bandButtons: [...root.querySelectorAll('[data-band]')],
    form: root.querySelector('#add-network-form'),
    name: root.querySelector('#network-name'),
    channel: root.querySelector('#network-channel'),
    error: root.querySelector('#form-error'),
    list: root.querySelector('#network-list'),
    empty: root.querySelector('#list-empty'),
    count: root.querySelector('#network-count'),
    recBanner: root.querySelector('#recommendation'),
    recChannel: root.querySelector('#rec-channel'),
    recDetail: root.querySelector('#rec-detail'),
    canvas: root.querySelector('#spectrum-chart'),
    copyLink: root.querySelector('#copy-link'),
    clearAll: root.querySelector('#clear-all'),
  };

  const spectrum =
    chart ??
    createSpectrumChart(els.canvas, {
      reducedMotion: deps.reducedMotion,
      raf: deps.raf,
      devicePixelRatio: deps.devicePixelRatio,
    });

  function populateChannelOptions() {
    const options = ['<option value="">Channel…</option>']
      .concat(channelsForBand(activeBand).map((ch) => `<option value="${ch}">CH ${ch}</option>`))
      .join('');
    els.channel.innerHTML = options;
  }

  function setBand(band) {
    if (band === activeBand) return;
    activeBand = band;
    clearError();
    els.bandButtons.forEach((btn) => {
      const on = btn.dataset.band === band;
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('is-active', on);
    });
    populateChannelOptions();
    render();
  }

  function render() {
    const inBand = store.networksForBand(activeBand);
    renderList(inBand);
    const result = inBand.length
      ? leastCongestedChannel(activeBand, channelsForBand(activeBand), inBand)
      : null;
    renderRecommendation(inBand, result);
    spectrum.setState({
      networks: inBand,
      band: activeBand,
      freqRange: FREQ_RANGES[activeBand],
      recommendation: result
        ? { channel: result.channel, freq: centerFrequency(activeBand, result.channel), score: result.score }
        : null,
    });
  }

  function renderList(inBand) {
    els.count.textContent = String(inBand.length);
    els.empty.hidden = inBand.length > 0;
    els.list.innerHTML = inBand
      .map(
        (n) => `
        <li class="net-item" data-id="${n.id}">
          <span class="net-dot" aria-hidden="true"></span>
          <span class="net-name" title="${escapeHtml(n.name)}">${escapeHtml(n.name)}</span>
          <span class="net-chan">CH ${n.channel}</span>
          <button class="net-remove" data-remove="${n.id}" aria-label="Remove ${escapeHtml(n.name)}">✕</button>
        </li>`
      )
      .join('');
  }

  function renderRecommendation(inBand, result) {
    if (!inBand.length || !result) {
      els.recBanner.dataset.state = 'empty';
      els.recChannel.textContent = '—';
      els.recDetail.textContent = `Add the ${BAND_LABEL[activeBand]} networks around you to find the clear channel.`;
      return;
    }
    const clear = result.score === 0;
    els.recBanner.dataset.state = clear ? 'clear' : 'busy';
    els.recChannel.textContent = `CH ${result.channel}`;
    els.recDetail.textContent = clear
      ? `Wide open on ${BAND_LABEL[activeBand]} — set your router here.`
      : `Least congested on ${BAND_LABEL[activeBand]} · overlap score ${result.score.toFixed(2)}.`;
  }

  function clearError() {
    els.error.textContent = '';
    els.error.hidden = true;
    els.name.setAttribute('aria-invalid', 'false');
    els.channel.setAttribute('aria-invalid', 'false');
  }

  function showError(message, field) {
    els.error.textContent = message;
    els.error.hidden = false;
    if (field) field.setAttribute('aria-invalid', 'true');
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearError();
    const name = els.name.value.trim();
    if (!name) {
      showError('Give the network a name so you can tell it apart.', els.name);
      els.name.focus();
      return;
    }
    const channel = Number(els.channel.value);
    if (!els.channel.value || Number.isNaN(channel)) {
      showError('Pick which channel this network is on.', els.channel);
      els.channel.focus();
      return;
    }
    store.add({ name, channel });
    els.name.value = '';
    els.name.focus();
  }

  async function handleCopyLink() {
    const base = (deps.location ?? location).origin + (deps.location ?? location).pathname;
    const url = buildShareUrl(base, store.getNetworks());
    const ok = await copyText(url, deps.clipboard);
    flashButton(els.copyLink, ok ? 'Link copied!' : 'Copy failed', 'Copy link');
  }

  els.bandButtons.forEach((btn) =>
    btn.addEventListener('click', () => setBand(btn.dataset.band))
  );
  els.form.addEventListener('submit', handleSubmit);
  els.name.addEventListener('input', clearError);
  els.list.addEventListener('click', (event) => {
    const id = event.target.closest('[data-remove]')?.dataset.remove;
    if (id) store.remove(id);
  });
  els.copyLink.addEventListener('click', handleCopyLink);
  els.clearAll.addEventListener('click', () => store.clear());

  store.subscribe(() => {
    saveNetworks(store.getNetworks(), deps.storage);
    render();
  });

  populateChannelOptions();
  if (typeof spectrum.resize === 'function') spectrum.resize();
  render();

  const onResize = () => {
    if (typeof spectrum.resize === 'function') spectrum.resize();
  };
  (deps.window ?? window)?.addEventListener?.('resize', onResize);

  return { store, setBand, destroy: () => (deps.window ?? window)?.removeEventListener?.('resize', onResize) };
}

// URL share param wins over localStorage so a shared link always reproduces its
// spectrum even if the visitor has their own saved networks.
function initialNetworks(deps) {
  const search = (deps.location ?? safeLocation())?.search ?? '';
  const shared = parseShareParam(search);
  if (shared.length) return shared;
  return loadNetworks(deps.storage);
}

function template() {
  return `
    <div class="cc-shell">
      <header class="cc-header">
        <div class="cc-wordmark">Channel<span class="cc-scan"> Clear</span></div>
        <p class="cc-tagline">Type in the Wi-Fi your phone already sees — get the one clear channel for your router.</p>
      </header>

      <main class="cc-main">
        <section class="cc-rail" aria-label="Network controls">
          <div class="band-toggle" role="group" aria-label="Frequency band">
            <button type="button" data-band="${BAND_2_4GHZ}" class="is-active" aria-pressed="true">2.4 GHz</button>
            <button type="button" data-band="${BAND_5GHZ}" aria-pressed="false">5 GHz</button>
          </div>

          <form id="add-network-form" novalidate>
            <label class="field">
              <span class="field-label">Network name</span>
              <input id="network-name" type="text" autocomplete="off" placeholder="e.g. Apt 4B" />
            </label>
            <div class="field-row">
              <label class="field">
                <span class="field-label">Channel</span>
                <select id="network-channel"></select>
              </label>
              <button type="submit" class="btn btn-primary">Add</button>
            </div>
            <p id="form-error" class="form-error" role="alert" hidden></p>
          </form>

          <div class="list-head">
            <h2>Networks nearby <span class="pill" id="network-count">0</span></h2>
          </div>
          <ul id="network-list" class="net-list"></ul>
          <p id="list-empty" class="list-empty">No networks yet on this band. Add the ones around you above.</p>

          <div class="rail-actions">
            <button type="button" id="copy-link" class="btn btn-ghost">Copy link</button>
            <button type="button" id="clear-all" class="btn btn-ghost">Clear all</button>
          </div>
        </section>

        <section class="cc-stage" aria-label="Spectrum">
          <div id="recommendation" class="rec-banner" data-state="empty" aria-live="polite">
            <div class="rec-main"><span class="rec-tag">Recommended</span><span id="rec-channel" class="rec-channel">—</span></div>
            <p id="rec-detail" class="rec-detail"></p>
          </div>
          <div class="chart-frame">
            <canvas id="spectrum-chart" role="img" aria-label="Overlapping Wi-Fi channel spectrum"></canvas>
          </div>
        </section>
      </main>

      <footer class="cc-footer">
        <span>Overlap math runs entirely in your browser — nothing leaves your device.</span>
      </footer>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

async function copyText(text, clipboard) {
  const cb = clipboard ?? (typeof navigator !== 'undefined' ? navigator.clipboard : null);
  if (!cb || typeof cb.writeText !== 'function') return false;
  try {
    await cb.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function flashButton(button, temp, original) {
  if (!button) return;
  button.textContent = temp;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1400);
}

function safeLocation() {
  try {
    return typeof location !== 'undefined' ? location : null;
  } catch {
    return null;
  }
}
