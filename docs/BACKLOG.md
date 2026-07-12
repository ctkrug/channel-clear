# Channel Clear — Backlog

Epics and stories for the build phase. Every story lists verifiable acceptance criteria that a
later QA run can check true/false. Story 1 is the wow moment and ships first.

## Epic 1 — Core spectrum experience

- [ ] **1. Live spectrum chart redraws on every network add/remove (WOW MOMENT)**
  - Adding a network via the form immediately (no page reload) adds a new filled curve to the
    canvas within one animation frame.
  - Removing a network removes only that network's curve from the canvas; other curves are
    unaffected.
  - The chart canvas renders at `devicePixelRatio` and recomputes without blurring when the
    browser window is resized.

- [ ] **2. Add-network form captures name, band, and channel with validation**
  - Submitting the form with an empty name field shows an inline error and does not add a
    network.
  - Selecting "5GHz" narrows the channel dropdown to only the non-DFS channels
    (36/40/44/48/149/153/157/161/165).
  - Submitting a valid entry clears the name field and appends the network to the visible list.

- [ ] **3. Remove a network from the running list**
  - Each list item has a remove control that deletes only that network from state and the
    chart.
  - Removing the last remaining network returns the chart to its empty state and clears the
    recommendation text.

- [ ] **4. Least-congested-channel recommendation with a visible marker**
  - The recommended channel number and its congestion score are displayed as text near the
    chart.
  - The recommended channel is marked on the chart with a distinct visual marker at its center
    frequency.
  - Given networks on channels 1 and 6 (2.4GHz), the recommendation is channel 11.

- [ ] **5. Design polish — apply DESIGN.md's blueprint direction to the core add/chart flow**
  - Chart panel renders the blueprint grid background and cyan trace / amber marker tokens from
    `docs/DESIGN.md`.
  - All form controls (text input, select, button) have themed hover/focus/active states — no
    unstyled native widgets.
  - Desktop layout (1440px) matches `docs/DESIGN.md`'s composition: chart panel occupies ≥60% of
    viewport width.

## Epic 2 — Accuracy & bands

- [ ] **6. Independent 2.4GHz/5GHz band toggle drives its own recommendation**
  - Switching the band selector filters the visible network list/chart to only that band's
    networks.
  - The recommendation and chart update to reflect the newly selected band without a page
    reload.
  - Networks entered on the other band are preserved in state (not deleted) when switching
    back.

- [ ] **7. Adjacent-channel interference curve matches expected overlap behavior**
  - Unit tests confirm channels 1/6/11 on 2.4GHz report zero interference with each other.
  - Unit tests confirm two networks on the same channel report full (1.0) interference.
  - Unit tests confirm channels a few numbers apart report partial (>0, <1) interference.

- [ ] **8. Duplicate and invalid input handling**
  - Adding a second network with a name already in the list is allowed (real SSIDs can repeat)
    and each entry gets a unique internal id.
  - The channel dropdown only ever lists values valid for the selected band, so an
    out-of-range channel cannot be submitted.
  - Submitting with no channel selected shows an inline error instead of adding a malformed
    entry.

- [ ] **9. Design polish — band toggle and responsive layout at all breakpoints**
  - Band toggle has themed active/inactive states matching `docs/DESIGN.md` tokens.
  - Page is verified at 390px, 768px, and 1440px widths with no horizontal scroll or
    overlapping elements.
  - Chart panel maintains ≥60vh height on mobile per `docs/DESIGN.md` layout intent.

## Epic 3 — Polish & ship

- [ ] **10. Persist entered networks across page reloads**
  - Reloading the page after adding networks restores the same list from `localStorage`.
  - A first visit (empty `localStorage`) shows the designed empty state, not an error.

- [ ] **11. Shareable link encodes the current network list**
  - A "copy link" control generates a URL with the current networks encoded in a query
    parameter.
  - Opening that URL in a fresh session (no `localStorage`) reproduces the same network list and
    chart.

- [ ] **12. Accessibility pass**
  - Every interactive control is reachable via Tab in a logical order with a visible focus
    ring.
  - Recommendation text updates are announced via an `aria-live` region.
  - Icon-only buttons (e.g. remove network) have an `aria-label`.

- [ ] **13. Ship-ready branding and final design self-review**
  - A custom favicon (generated in code, using the accent color + a monogram) replaces the
    default.
  - The page includes meta title/description suitable for social sharing.
  - `docs/DESIGN.md`'s D3 self-review checklist (resize, squint, tab-through, control states) is
    completed and noted in the closing STATUS `memory`.
