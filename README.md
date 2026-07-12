# Channel Clear

[![CI](https://github.com/ctkrug/channel-clear/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/channel-clear/actions/workflows/ci.yml)

Find the least-congested Wi-Fi channel for your router — no login, no app, no guessing.

Type in the networks your phone already sees (name + channel) and Channel Clear draws a live
spectrum chart of every signal's overlap and adjacent-channel bleed, then points a big arrow at
the one gap channel that's actually clear.

## Why

Every "Wi-Fi analyzer" app wants a login, a subscription, or a native install just to tell you
"channel 6 is busy." Channel Clear is a single page: you already have the data (your phone's
Wi-Fi settings show every nearby network's name and channel) — type it in and get an answer in
one click, with the reasoning drawn on screen instead of hidden in a black-box score.

## What it does

- Add each neighboring network you can see (SSID + band + channel).
- Watch a live 2.4GHz/5GHz spectrum chart redraw as you add networks, showing real
  overlapping-curve math — not just "channels in use."
- Get the single least-congested channel for your own router, with the gap highlighted.
- Everything runs client-side. No accounts, no network calls, no data leaves your browser.

## The wow moment

Add a network, watch the spectrum chart redraw with its overlap curve live, keep adding
networks, and see the arrow move to the one remaining clear channel — the whole reasoning
process is visible, not just the final answer.

## Stack

- Vanilla JavaScript + HTML5 Canvas (no UI framework — the chart is the product)
- [Vite](https://vitejs.dev/) for dev server + static build
- [Vitest](https://vitest.dev/) for unit tests on the channel-overlap math
- Zero backend — ships as a static site, deployable to any static host

## How to use it

1. Open your phone's Wi-Fi settings (or any Wi-Fi analyzer) and note the networks around you —
   each one's name and channel.
2. Pick the band (**2.4 GHz** or **5 GHz**) and add each network by name + channel. The spectrum
   chart redraws live with every network's overlap curve.
3. Read the **Recommended** channel at the top of the chart — the amber marker points at the
   least-congested channel for your router on the selected band. Set your router there.
4. **Copy link** shares your exact spectrum; your networks are also saved locally and restored on
   reload.

The 2.4 GHz and 5 GHz bands are tracked independently — switching the toggle re-scopes the chart
and recommendation without losing what you entered on the other band.

## Status

Core experience is functional: live spectrum, per-band recommendation, validation, remove,
persistence, and shareable links. See [`docs/VISION.md`](docs/VISION.md) for the plan,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the code map, and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the story breakdown.

## Local development

```bash
npm install
npm run dev      # local dev server
npm test         # run the full test suite (domain math, state, chart, UI)
npm run coverage # test suite with v8 coverage report
npm run lint     # ESLint
npm run build    # static build to dist/ (base-path relative — subpath-safe)
```

## License

MIT — see [LICENSE](LICENSE).
