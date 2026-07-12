# Channel Clear

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

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the plan and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for the build breakdown.

## Local development

```bash
npm install
npm run dev      # local dev server
npm test         # run the overlap-math test suite
npm run build    # static build to dist/
```

## License

MIT — see [LICENSE](LICENSE).
