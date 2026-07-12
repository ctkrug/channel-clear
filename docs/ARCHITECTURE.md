# Channel Clear — Architecture

A single-page, framework-free JavaScript app (Vite build, Vitest tests). All logic runs in the
browser; nothing is sent anywhere. The spectrum chart is drawn directly to a `<canvas>` because
the chart *is* the product.

## Run / test / build

```bash
npm install
npm run dev     # local dev server (Vite)
npm test        # Vitest — pure logic + jsdom UI tests
npm run lint    # ESLint (flat config)
npm run coverage # Vitest with v8 coverage (src/**, main.js excluded)
npm run build   # static bundle into dist/ (base: './' — subpath-safe)
```

The build is static and base-path-relative, so it can be hosted under a subpath
(`apps.charliekrug.com/channel-clear/`). Never introduce leading-slash absolute asset paths.

## Data flow

```
user input ─▶ ui/app.js ─▶ state/store.js ──(subscribe)──▶ ui/app.js render()
                  │                                              │
                  │                                              ├─▶ renders network list + recommendation banner
                  │                                              └─▶ chart/spectrumChart.js setState()
                  ├─▶ state/persistence.js  (save on every change)
                  └─▶ state/share.js        (copy-link / restore-from-URL)
```

`app.js` is the only stateful coordinator. Every mutation goes through the store; the store's
`subscribe` callback re-persists and re-renders, so the list, recommendation, and canvas can
never disagree.

## Modules

### `src/limits.js` — input guardrails
Shared caps applied by the store so no entry path can build a pathological list: `MAX_SSID_LENGTH`
(32, the 802.11 SSID max — names are truncated to it) and `MAX_NETWORKS` (128 — the list is bounded
on initial load, `add`, and `replaceAll`). Keeps a crafted share link or hand-edited storage from
flooding the render loop.

### `src/wifi/` — the domain (pure, no DOM)
- **`channels.js`** — channel↔frequency tables for 2.4 GHz (1–13) and non-DFS 5 GHz
  (36/40/44/48/149/153/157/161/165), band lookups, channel width. Source of truth for what is
  legal to plot/recommend.
- **`overlap.js`** — the overlap math. Models each network as a raised-cosine energy curve
  (`sampleCurve` for the chart), computes pairwise `interferenceBetween`, sums to a
  `congestionScore`, and ranks channels via `leastCongestedChannel` (ties break low).

### `src/state/` — app state (pure, injectable I/O)
- **`store.js`** — `createStore()`: observable list of networks across both bands. Derives band
  from channel, assigns unique ids (duplicate SSIDs stay distinct), notifies subscribers, and
  enforces the `src/limits.js` caps (name truncation + list size, `add` returns `null` when full).
- **`persistence.js`** — localStorage save/load of `{name, channel}` under a versioned key;
  validates on load and drops unknown/stale entries. Storage is injectable for tests.
- **`share.js`** — encode/decode the network list to a URL param (`?n=name.channel~…`), escaping
  separators inside SSIDs. Drops malformed pairs on decode.

### `src/chart/` — the canvas instrument
- **`theme.js`** — canvas-side copy of the DESIGN.md palette (CSS owns the DOM's colors).
- **`render.js`** — pure drawing primitives (`freqToX`, `drawGrid`, `drawCurve`, `drawMarker`,
  `drawSweep`) operating in CSS-pixel space, so they're deterministic and unit-testable with a
  recording mock context.
- **`spectrumChart.js`** — `createSpectrumChart(canvas)`: the controller. Owns the
  devicePixelRatio backing store (crisp on retina, recomputed on `resize()`) and a
  requestAnimationFrame tween loop (curves grow in, only the removed trace shrinks out, the
  recommendation marker slides). Honors `prefers-reduced-motion` by settling instantly. All I/O
  (raf, dpr, reduced-motion) is injectable.

### `src/ui/` — the DOM
- **`app.js`** — `mountApp(root, deps)`: builds the DOM, wires the band toggle, validated
  add-network form, removable list, aria-live recommendation banner, copy-link/clear actions,
  and the resize handler. Restores state from a share link (preferred) or localStorage on load.
  Dependencies (chart, storage, location, clipboard, window) are injectable for tests.
- **`favicon.js`** — generates the favicon in code as an inline SVG data-URI from the theme.

### Entry
- **`src/main.js`** — mounts the app into `#app`.
- **`index.html`** — loads fonts (JetBrains Mono + Inter), social meta, `#app` root.

## Testing approach
- Domain + state modules are tested as pure functions (happy path + boundaries: empty, malformed,
  unknown channels, duplicates, input caps).
- The overlap math also has **property-based tests** (fast-check) asserting invariants across every
  channel pair: bounded `[0,1]` interference, co-channel = 1, band symmetry/isolation, score
  monotonicity, and least-congested = the tie-low global minimum.
- The chart controller is tested with a recording canvas context and injected raf/dpr, including a
  flushable raf that steps the tween loop deterministically.
- `app.js` is tested in jsdom with a fake chart + memory storage, asserting observable behavior
  (list contents, error visibility, recommendation text, band preservation, share restore).
