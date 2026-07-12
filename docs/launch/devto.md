---
title: I built a Wi-Fi channel planner that draws its own reasoning
published: false
tags: javascript, canvas, webdev, networking
---

My Wi-Fi kept stalling every evening, and I was pretty sure a neighbor's router had landed on the
same channel as mine. The tools that promise to sort this out all wanted a native install with
location permission, or a login, and then handed back a flat "channel 6 is busy" with nothing
behind it. So I built [Channel Clear](https://apps.charliekrug.com/channel-clear/): you type in the
networks your phone already lists in its Wi-Fi settings, and it charts the overlap and points at
the least-congested channel for your own router. It is one static page, no backend, nothing leaves
the browser.

Here are the two build decisions I found most interesting.

## One curve, two jobs

The obvious way to score congestion is a lookup table: channels 1, 6, and 11 do not overlap on
2.4GHz, so just count who is on what. But that throws away the interesting part, which is that a
router three channels away still bleeds into you. Real 2.4GHz channels are about 22 MHz wide but
spaced only 5 MHz apart, so adjacency is a gradient, not a yes/no.

So each network is modeled as a raised-cosine energy curve centered on its channel, flat across its
own width and tapering to zero at roughly twice its half-width:

```js
function energyAt(freqMHz, centerMHz, widthMHz) {
  const halfWidth = widthMHz / 2;
  const distance = Math.abs(freqMHz - centerMHz);
  const falloffEdge = widthMHz;
  if (distance >= falloffEdge) return 0;
  if (distance <= halfWidth) return 1;
  const t = (distance - halfWidth) / (falloffEdge - halfWidth);
  return 0.5 * (1 + Math.cos(t * Math.PI));
}
```

The part I liked: the chart and the recommendation use the exact same function. The chart samples
the curve across the band to draw each network's shape. The recommendation needs the peak overlap
between a candidate channel and a neighbor, and the peak of two equal-width curves is just the
energy one curve contributes at the other's center. So `interferenceBetween` is a one-liner that
calls `energyAt` at the candidate's center frequency. There is no second "scoring" model that can
drift away from what you see drawn. What is on screen is what is scored.

That also made the math easy to pin down with property-based tests (fast-check): interference is
always in [0, 1], a co-channel neighbor is always exactly 1, the two bands never interfere with each
other, and the recommended channel is always the true minimum with ties broken low.

## Animating a canvas without a jank frame

The chart is a plain `<canvas>`, and it needed to feel like an instrument, so curves grow in when
you add a network and only the removed trace shrinks out. I keep a `Map` of per-network animation
records keyed by id, each with a `scale` that eases toward a target of 1 (present) or 0 (removed).
A small requestAnimationFrame loop advances every record a fraction each frame and drops a record
once it has fully shrunk. Because the animation is keyed by id, removing one network touches only
its own curve.

Two details that are easy to miss and worth getting right:

- The canvas renders at `devicePixelRatio` and recomputes on resize, so it stays crisp on retina
  screens and reflows instead of stretching.
- Under `prefers-reduced-motion`, the loop settles everything immediately and, crucially, stops
  scheduling frames. An idle "spectrum sweep" animation in the empty state is nice, but leaving a
  perpetual rAF running for someone who asked for less motion is both rude and a battery drain.

## What I would do next

Right now it assumes 20 to 22 MHz channels. Adding 40/80 MHz width selection and the DFS 5GHz
channels would make it accurate for people running wider channels. I would also like a way to
import the network list from a screenshot of the phone's Wi-Fi screen, since typing five SSIDs is
the only friction left.

Code is on [GitHub](https://github.com/ctkrug/channel-clear) and the live version is at
[apps.charliekrug.com/channel-clear](https://apps.charliekrug.com/channel-clear/). Happy to hear
how the recommendation holds up against a real spectrum analyzer if anyone has one handy.
