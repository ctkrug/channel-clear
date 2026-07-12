# Channel Clear — Design

## 1. Aesthetic direction

**Blueprint/technical.** Channel Clear is an RF instrument, not a consumer toy: it should feel
like a spectrum analyzer on an engineer's bench — a dark schematic-grid background, a cyan
"live signal" trace, amber for the recommended-channel marker, and a monospace UI voice for
numbers and labels. This distinguishes it from soft/toy directions and from generic dark-card
dashboards — the grid and the CRT-adjacent glow are the personality, not just a color choice.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0e14` | page background |
| `--surface-1` | `#111823` | panels, form card |
| `--surface-2` | `#1a2433` | raised elements (chart canvas frame, list items) |
| `--text` | `#e6edf5` | primary text |
| `--text-muted` | `#7c8ba1` | labels, secondary copy |
| `--accent` | `#3ddbff` | primary trace color, links, focus ring |
| `--accent-support` | `#ffb454` | recommended-channel marker/arrow |
| `--success` | `#3ddc84` | clear-channel state |
| `--danger` | `#ff5c5c` | fully-congested state, validation errors |
| `--grid-line` | `rgba(61, 219, 255, 0.08)` | blueprint grid overlay on the chart panel |

**Type pairing:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) for the
wordmark, headings, and all numeric/channel data (it's a diagnostic tool — numbers should read
like instrument output). [Inter](https://fonts.google.com/specimen/Inter) for body copy and form
labels, so paragraphs stay easy to read. System fallback stack: `ui-monospace, "SF Mono",
Consolas, monospace` and `system-ui, -apple-system, sans-serif` respectively.

**Spacing:** 4px base unit (4/8/12/16/24/32/48/64).

**Corner radius:** 6px on inputs/buttons, 10px on panels/cards — sharp enough to read as
technical, not soft.

**Shadow/glow:** panels get a faint outer `box-shadow: 0 0 24px rgba(61,219,255,0.06)`; the
active trace on the chart gets a subtle `drop-shadow` glow matching its stroke color, like a
phosphor trace.

**Motion:** UI transitions 150ms ease-out (hover/focus/press). Chart redraws animate curve
height/position over 200ms ease-out on add/remove so the "gap closing in" reads as motion, not a
jump-cut.

## 3. Layout intent

The hero is the spectrum chart. On desktop (1440×900): a left rail (~320px) holds the add-network
form and the running network list; the remaining ~70% of viewport width is the chart panel,
filling the vertical space with the blueprint grid, curves, and the recommendation banner
along its top edge. On phone (390×844): the form and list stack above the chart, but the chart
still gets its own full-width section at ≥60vh so it's never a shrunken afterthought below the
fold.

## 4. Signature detail

The wordmark "Channel Clear" renders in JetBrains Mono with the word "Clear" given a live cyan
scan-line animation (a thin highlight sweeping left-to-right on a loop, like a spectrum analyzer
mid-sweep) — a small flourish that signals "this is a live instrument" before any data is
entered. The empty-chart state before any network is added shows the blueprint grid alone with a
dimmed placeholder sweep line, rather than a blank box.

## 5. Juice plan

Not applicable — Channel Clear is a utility/instrument, not a game or playful toy. Feedback is
still required per D2 (themed hover/focus/active states on all controls, 150ms transitions,
animated chart redraws) but no SFX or win-celebration mechanics apply.
