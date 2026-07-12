# Channel Clear — Vision

## The problem

Home Wi-Fi congestion is almost always caused by neighbors' routers sitting on the same or an
adjacent channel. Every phone's Wi-Fi settings screen already shows the fix's raw ingredients —
nearby network names and their channels — but turning that list into "which channel should I
actually use" requires understanding channel width and adjacent-channel bleed, which nobody
wants to learn. Existing Wi-Fi analyzer tools either require installing a native app with
location permissions (to scan Wi-Fi at all) or are paid/ad-supported and still just spit out a
static "channel 6 is congested" verdict with no visible reasoning.

## Who it's for

Anyone who's ever stood in their kitchen with their phone open to Settings → Wi-Fi, squinting at
a list of neighbors' network names and channel numbers, wondering which channel to put their own
router on. No networking background assumed — the chart itself teaches the "why."

## The core idea

You already have the data. Channel Clear asks for exactly what your phone shows you (network
name, band, channel) and nothing else — no location permission, no native scan, no login. As
you add each network, a live spectrum chart redraws showing that network's real interference
curve (channel width + adjacent-channel falloff, not just "this channel is used"). Once you've
entered what you see, one clear arrow points at the least-congested channel left for your own
router.

## Key design decisions

- **Manual input, not a live scan.** Browsers can't scan Wi-Fi directly, and a native app would
  break the zero-install promise. Typing in 3-5 networks from your phone's settings screen takes
  under a minute and keeps this a URL, not an install.
- **Real overlap math, not a lookup table.** Each network is modeled as a tapered energy curve
  centered on its channel (see `src/wifi/overlap.js`) so the chart and the recommendation both
  reflect actual adjacent-channel interference — two networks 3 channels apart show partial
  overlap, not "unrelated."
- **The chart redraws live, every add.** The reasoning is the product. A static "recommended:
  channel 11" text box is what every competitor already does; watching the curves stack up and
  the gap narrow is the differentiator.
- **2.4GHz and 5GHz are modeled separately.** They never interfere with each other and have
  different channel widths/spacing, so the UI and the math treat them as two independent bands
  with their own recommendation.
- **No accounts, no backend, no network calls.** Everything — input, math, chart — runs
  client-side. Nothing typed in ever leaves the browser.
- **Ships as a static site.** No server-side logic is needed, so it deploys anywhere (including
  a subpath like `apps.charliekrug.com/channel-clear`) with a plain static build.

## What "v1 done" looks like

- A visitor can add several networks (name, band, channel) via a form with no page reload.
- The spectrum chart redraws immediately after every add/remove, correctly reflecting 2.4GHz
  channel width and adjacent-channel falloff.
- A single, unambiguous recommended channel (with a visible marker/arrow on the chart) updates
  live as networks are added or removed, for both 2.4GHz and 5GHz.
- The page works and looks intentionally designed at phone and desktop widths, matches
  `docs/DESIGN.md`, and needs no login, install, or network request to function.
- The overlap-math module has unit test coverage for the interference model and the
  least-congested-channel selection.
