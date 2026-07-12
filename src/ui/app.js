import { BAND_2_4GHZ, BAND_5GHZ, centerFrequency, channelsForBand } from '../wifi/channels.js';
import { leastCongestedChannel } from '../wifi/overlap.js';
import { drawSpectrum } from '../chart/spectrumChart.js';

const FREQ_RANGES = {
  [BAND_2_4GHZ]: { min: 2400, max: 2485 },
  [BAND_5GHZ]: { min: 5170, max: 5835 },
};

const CURVE_COLORS = ['#4f8fff', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

// Minimal scaffold wiring: an add-network form, a running list, and a
// canvas that redraws on every change. Visual polish follows docs/DESIGN.md
// in the build phase — this proves the data flow end to end.
export function mountApp(root) {
  const networks = [];
  let band = BAND_2_4GHZ;

  root.innerHTML = `
    <form id="add-network-form">
      <input id="network-name" type="text" placeholder="Network name" required />
      <select id="network-band">
        <option value="${BAND_2_4GHZ}">2.4GHz</option>
        <option value="${BAND_5GHZ}">5GHz</option>
      </select>
      <select id="network-channel"></select>
      <button type="submit">Add network</button>
    </form>
    <ul id="network-list"></ul>
    <p id="recommendation"></p>
    <canvas id="spectrum-chart" width="800" height="300"></canvas>
  `;

  const form = root.querySelector('#add-network-form');
  const nameInput = root.querySelector('#network-name');
  const bandSelect = root.querySelector('#network-band');
  const channelSelect = root.querySelector('#network-channel');
  const list = root.querySelector('#network-list');
  const recommendation = root.querySelector('#recommendation');
  const canvas = root.querySelector('#spectrum-chart');
  const ctx = canvas.getContext('2d');

  function populateChannelOptions() {
    channelSelect.innerHTML = channelsForBand(bandSelect.value)
      .map((ch) => `<option value="${ch}">${ch}</option>`)
      .join('');
  }

  function render() {
    list.innerHTML = networks
      .map((n) => `<li>${n.name} — ${n.band} ch ${n.channel}</li>`)
      .join('');

    band = bandSelect.value;
    const candidates = channelsForBand(band);
    const inBand = networks.filter((n) => n.band === band);
    const result = leastCongestedChannel(band, candidates, inBand);
    const bestFreq = centerFrequency(band, result.channel);

    recommendation.textContent = networks.length
      ? `Recommended channel: ${result.channel} (congestion score ${result.score.toFixed(2)})`
      : 'Add a neighboring network to see a recommendation.';

    drawSpectrum(ctx, canvas.width, canvas.height, {
      networks: inBand,
      freqRange: FREQ_RANGES[band],
      best: { freqMHz: bestFreq },
      colors: CURVE_COLORS,
    });
  }

  bandSelect.addEventListener('change', () => {
    populateChannelOptions();
    render();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const channel = Number(channelSelect.value);
    networks.push({ name: nameInput.value.trim(), band: bandSelect.value, channel });
    nameInput.value = '';
    render();
  });

  populateChannelOptions();
  render();
}
