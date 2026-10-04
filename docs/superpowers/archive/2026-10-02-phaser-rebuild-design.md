# Satyrn — The Thread: full-Phaser rebuild (design spec)

**Date:** 2026-10-02
**Status:** accepted — implementation planning follows
**Supersedes:** `2026-10-02-satyrn-book-as-game-design.md` (the Lit/DOM hybrid),
which remains in this folder as history but is no longer the build target.
**Decisions locked in brainstorming:** Approach A (Phaser owns everything),
sound effects default **off**, responsive layout playable on mobile portrait
phones as well as desktop, UX quality outranks code minimalism.

## One line

Rebuild *Satyrn — The Thread* as a **full-Phaser 3 game**: one canvas owns the
title/prologue, map, ten world minigames, dialogue, journal, and HUD. The only
DOM in the page is the canvas mount, a visually-hidden aria-live region for
screen readers, and transient invisible native inputs summoned for text entry
(native mobile keyboards). No Lit, no HTML game chrome, no inline links —
navigation is buttons calling the hash router.

## Goal (unchanged from the old spec)

Teach Satyrn's world — AI systems, attention, tokens/context, models/taxonomy,
agents/harnesses, runaway loops, ambiguity, evaluation-as-evidence, spec-driven
development, local-vs-cloud, open community — to **beginners first**, while
rewarding intermediate players. Every world teaches one idea through one real,
playable minigame with instant feedback, a fail state, and free retry.

## What this fixes (the six review complaints)

1. **No prologue** → a TitleScene with premise, cast cards (Satyrn, Moon,
   Wayfarer), the ten keepers, how-to-play, and act title-cards on the journey.
2. **Mode switch dead inside a world** → a persistent HUD overlay that never
   unmounts; the Thread/Wander toggle works from every scene including mid-world.
3. **Lantern Room was a black square** → the mechanic *is* the attention
   metaphor (light = what the Satyrn can know), with a playable hallucination
   beat; the AI-system/attention explanation arrives through played dialogue,
   and concept cards are earned afterwards — never inline links.
4. **Journal had no way back** → the journal is a Moon overlay with a Back
   button returning to the stored `returnTo` route.
5. **Buttons/links used senselessly** → one Phaser UI factory; every action is
   a button with shared states; there are no links anywhere.
6. **Multiple-choice tedium, no gamification** → nine real-time, animated,
   juicy minigames plus stars, combos, toasts, and a map that stitches itself
   together as beads light.

## Non-goals

- No backend, accounts, server, database, multiplayer, analytics, telemetry.
- No live model calls; the Satyrn is scripted. Fully offline after load.
- No localization (structure still allows it later; v1 single-language).
- No PWA/service worker, no native app wrapper. Mobile means mobile browsers.
- No external art or audio assets: all textures drawn in code, all SFX
  synthesized with WebAudio. (Keeps the offline constraint and the
  no-licensed-assets rule from the old spec.)
- No reuse of the purchased Triple Charm webfonts. Type is system stacks only.

## Keep / delete inventory

**Keep and extend:**

- `content/*.yaml` — worlds, dialogues, characters, concepts, achievements,
  threads, strings. Mechanic `params` gain star thresholds (see §11).
- `tools/` — schema, loader, link checker, content build, Vite plugin, content
  Vite plugin. Extended with star-threshold validation.
- `src/store/` — event-bus store, persistence, achievements, migrations.
  Migrated to state v2 (see §12).
- `src/router.ts` — hash parse/build. Extended with a scene bridge and
  `#/thread` backward compatibility (old links land on the map in Thread mode).
- `src/thread.ts` — sequence helpers, unchanged.
- Scenario logic inside `src/mechanics/*/scenario.ts` — the pure parts
  (`simulate`, capacity checks, cycle detection, order matching) are ported
  into per-world `logic.ts` modules; the validators keep working the same way.

**Delete:**

- `src/components/*` (all Lit shell/dialogue/map/journal components),
  all Lit mechanic elements under `src/mechanics/*/`, `src/content.ts` glue as
  it stands (replaced by a thin content accessor for scenes).
- All DOM-based tests are rewritten against the new seams (see §13).

**Resulting layout:**

```
src/
  main.ts            canvas boot, page wiring, aria-live bridge
  game/
    theme.ts         single palette/type/spacing source of truth
    layout.ts        responsive layout manager (RESIZE re-flow)
    ui/              button, panel, card, tabs, meter, toast, focus manager
    audio.ts         WebAudio synth SFX, mute-by-default
    router-bridge.ts hash <-> scene navigation, returnTo memory
    scenes/          Boot, Title, Map, World, overlays (Hud, Dialogue, Journal, ActCard, Toasts)
    worlds/<id>/     logic.ts (pure, tested) + scene.ts (thin renderer) per world
  store/             state v2, migrations, persistence, achievements
  content-access.ts  typed reads over the generated content bundle
content/             YAML, as today + star params
tools/               as today + star validation
tests/               logic unit tests, focus-model tests, content tests, Playwright e2e
```

## Rendering and responsive shell

- **Phaser ^3.80 via npm**, bundled by the existing Vite setup. `base: './'`
  and hash routing stay, so GitHub Pages deployment keeps working.
- **Scale.RESIZE**: the canvas fills the viewport. A layout manager re-flows
  every scene on resize/orientation change through two layout modes:
  - **Expansive** (landscape / wide): room backdrop full-bleed; keeper and
    companions staged left, minigame board right; HUD top bar; dialogue as a
    bottom panel.
  - **Compact** (portrait phones): vertical stack — HUD top, compact stage
    strip, minigame board centered and scaled into the available rect, dialogue
    as a bottom sheet. The map becomes a vertically scrollable bead trail.
- **Touch-first:** every interactive target ≥ 48 CSS px; drag *and* tap drive
  every mechanic (birds, buckets, breaker, lantern beam follows touch-drag);
  no hover-dependent information; no pinch or multi-finger gestures required.
- **Device chrome:** safe-area insets respected; `touch-action: none` on the
  canvas (no scroll/double-tap-zoom interference); DPR capped at 2;
  particle counts scaled down on small screens.
- **Performance budget:** boot (texture generation) under ~1s on a mid-range
  phone; scene transitions under 300ms; 60fps during minigames; textures
  generated once in Boot and shared.

## The one UI system (Phaser factory + theme)

- `src/game/ui/` provides `makeButton`, `makePanel`, `makeCard`, `makeTabs`,
  `makeMeter`, `makeToast`. All buttons share palette, type scale, corner
  radius, and hover / press / disabled / focused states, plus a synthesized
  click blip when sound is on and a particle pop on press.
- `theme.ts` is the single source of truth (palette inherited from the brand
  tokens, spacing, type scale, radii). The sliver of page CSS uses the same
  values for the page background and the aria-live hiding, so canvas and page
  cannot drift.
- **Keyboard is first-class:** Tab / Shift-Tab and arrow keys move a visible
  focus ring through a per-scene focus registry; Enter/Space activates; Esc
  goes back (closes overlay, or leaves the world). Every minigame is fully
  completable keyboard-only.
- **Reduced motion** disables tweens, particles, and the typewriter effect
  (text appears instantly); the setting is respected alongside the OS
  `prefers-reduced-motion` default.
- **Screen readers:** a visually-hidden aria-live region narrates scene
  changes, dialogue lines, minigame status, and results. The canvas itself
  carries one role/label; the live region carries the words.
- **Text entry** (garden bead name, save import) summons an invisible native
  `<input>` so mobile users get their real keyboard; the value returns to the
  scene. Export uses `navigator.clipboard` with a visible fallback code.

## Audio (default off)

- `audio.ts`: WebAudio oscillator/noise-based SFX (clicks, pops, splashes,
  success chimes, fail thuds, ambient page-turn for cards). No audio files.
- `settings.soundOn` defaults to **false** and persists. The toggle lives in
  the HUD and on the title screen; first toggle-on plays a confirmation blip.
- No background music in v1; SFX only. (Music is a future content-free
  addition through the same module.)

## Scenes and navigation

- **BootScene** — generates and caches all textures (characters, beads, tiles,
  particles, portraits) in the flat in-code art style; reads content bundle;
  applies settings; routes to Title (new player) or Map (returning player with
  `seenPrologue`).
- **TitleScene** — the prologue (see §8). Sets `seenPrologue` on completion.
- **MapScene** — Thread presentation (stitched path, lit beads, glowing next
  bead, "Continue the Thread" button) and Wander presentation (beads grouped
  by act). Same scene, two layouts, switched live from the HUD.
- **WorldScene** — one scene class parameterized by world id: backdrop, keeper
  + Satyrn + Moon on stage, minigame board in the play rect, intro dialogue on
  entry, result fanfare on solve, earned concept cards after.
- **Persistent overlays** (separate scenes launched over the current one):
  **Hud** (mode toggle, ★ total, bead count, journal button, sound toggle),
  **Dialogue** (typewriter panel + choice buttons), **Journal** (Moon overlay,
  §10), **ActCard** (Moon narration between acts, skippable), **Toasts**
  (achievement + star + card fanfare, queued, never blocking input).
- **Router bridge:** hash changes drive scene switches; scene switches update
  the hash. Routes: `#/` (map), `#/world/<id>`, `#/journal` (overlay over the
  current scene, Back returns to `returnTo`). `#/thread` (legacy) maps to `#/`
  in Thread mode. Unknown routes show an in-canvas not-found card with a
  "Back to the map" button.

## Prologue and story embedding

- **TitleScene flow** (new players; replay skips to the map with one button):
  condensed to **3 screens**, with a persistent Skip button and no gates — the
  player can reach *Step onto the Thread* from any screen without doing
  anything else:
  1. Premise + you: "You are the Wayfarer, walking a thread between ten small
     handmade worlds…" — that's you, the one at the wheel.
  2. Companions + keepers: cast cards for the **Satyrn** (quick, curious,
     distractible — the little local model you are learning to keep on track)
     and the **Moon** (your memory; asks "how would we know that's true?"),
     plus the ten keepers as a cast list, each tied to their world. Portraits
     drawn in code, one flat style.
  3. How-to-play + depart (one card: move/tap, Tab+Enter works everywhere, Esc
     goes back, sound is off until you ask) with the *Step onto the Thread*
     button. The same Skip affordance from screens 1–2 lands here / on the map.
- **Act title-cards** narrated by the Moon when entering the first bead of an
  act in Thread mode (skippable; recorded in `seenActCards` so they show once).
- **Keepers stay on stage** during their worlds with idle animation and
  reaction lines on success/fail — the story is present in the room, not in a
  sidebar.

## The Lantern Room (prologue world, fully redesigned)

- A dark workshop. Your lantern beam follows pointer/touch-drag *and* arrow
  keys. Whatever the beam touches is revealed; everything else stays dark —
  and whatever is lit is all the Satyrn can see or speak about.
- The Satyrn asks for objects by name ("light the workbench"). **Light the
  wrong one and it confidently misdescribes it** ("Ah — the workbench, where
  the bread cools!" …for a shelf). The Moon cuts in: *"How would we know?
  Light it properly."* This is the hallucination beat, played, not told.
- Lighting a requested object fills a **coverage meter** (beam dwell over the
  target); full coverage triggers a warm reveal — dust motes, color bloom —
  and the Satyrn's true description.
- Light all requested spots (default: the workbench, the shelf, the hearth,
  the door; overridable in mechanic params) to complete the room.
- The attention/AI-system idea is spoken by the Satyrn and the Moon *as you
  play*; the two concept cards are **awarded after the solve** with fanfare.
- **Metric for stars:** mislights (confident wrong descriptions).

## The nine minigames

Each world keeps its learning goal and scenario params. Each is a real loop:
animated actors, instant feedback, a fail state with a visible cause, free
instant retry. Logic lives in pure `logic.ts` (no Phaser import); `scene.ts`
renders and gathers input. Star thresholds live in mechanic params (see §11).

- **Rain-Gauge Terrace** (tokens, context window): drops fall in real time —
  keep or release each by tap/click/keys. The cup holds exactly `capacity`;
  overflow spills with a splash. Plants need their essentials. Win: all plants
  watered. Metric: spills + lost essentials.
- **Aviary of Whispers** (models, taxonomy): birds with visible traits hop on
  perches; drag each onto an errand. A wrong match: the bird refuses *with a
  trait hint* ("too heavy for a quick errand"). Win: all errands matched.
  Metric: refusals.
- **Cartwright's Yard** (agents, harnesses): fit tool/limit/check parts into
  three slots, press **Run**, and *watch* the cart physically succeed,
  overshoot, stall, or roll blind past the market. Adjust and re-run. Win: a
  rig that arrives *and stops*. Metric: failed runs. (Reuses the proven
  `simulate` run model.)
- **Round Path** (runaway loops): the mule walks its circle live with a
  scrolling step log; place the Loop-Breaker token on the repeating step
  without stopping the useful work. Win: cycle broken, useful steps continue.
  Metric: wrong flags.
- **Gate of Orders** (instructions, constraints, ambiguity): arrange
  order-runes into a standing order, press **Test**; a parade of travelers
  marches through and your wording is applied *literally* — bad orders walk
  travelers into walls and ditches (comedy, then iteration). Win: an order
  that admits exactly the right travelers. Metric: failed test parades.
- **Assayer's Scale** (evaluation, evidence over vanity): weights drop onto
  rival scales; the gleaming scale praises *everything*. Choose which check to
  trust, then mark the unsound weight. Win: trust the check that can fail and
  mark truly. Metric: times vanity was trusted + wrong marks.
- **Blueprint and Mason** (spec-driven development): pick clauses into a spec,
  press **Build**; the Mason visibly builds measurable clauses into a wall
  while vague clauses ("sturdy enough") wobble into comic nothing. Win: a wall
  matching the drawing. Metric: failed builds.
- **Well and Pipe** (local vs cloud): a day cycle with arriving water needs;
  drag buckets to your private well or the shared congested pipe. Sensitive
  needs visibly leak if piped; the well has fixed capacity; the pipe congests
  at rush hour. Win: all needs met, nothing sensitive leaked. Metric: leaks +
  unmet needs.
- **Commons Garden** (community, epilogue): name your bead (native input),
  choose a seed, plant it among the others; wander visitors' beads. No fail
  state — planting completes the garden at full stars and grants the journey
  honors.

## Gamification

- **Stars:** 1–3 per world from the real play metric, thresholds in content
  params (`stars: { three, two }` = max mistakes for 3 / 2 stars; 1 star for
  completing). HUD shows ★ total; the map lights beads and stitches the thread
  between solved ones. Stars reward mastery and never gate progress.
- **Combos:** clean streaks inside minigames (3/5 without a mistake) earn
  particle + sound celebrations. Cosmetic only — never affects stars — so the
  build-time validator stays simple.
- **Toasts:** achievements, stars, and earned concept cards announce the
  moment they happen, queued and non-blocking.
- **Honest skip preserved:** *Continue without playing* is available in every
  world, recorded as a skip (its own achievement), granting no stars and no
  lesson. Nobody is ever stuck.

## Dialogue, concepts, journal (all in-canvas)

- Keeper dialogues stay data-driven from the same YAML + conditions, rendered
  as typewriter panels with choice **buttons** over the live scene.
- Concepts are **never inline links**. They are earned cards: full-screen
  fanfare on award, stored in the journal, viewable any time.
- The **Journal** is a full Moon overlay with tabs — Journey (progress incl.
  stars), Cards (earned concepts), Honors (achievements), Keepsake
  (export / import / reset) — and a **Back button** returning to the stored
  `returnTo` route. This fixes the dead-end structurally: the journal is an
  overlay, and Back always knows where you came from.

## Content schema and validation changes

- `Mechanic`: drop `element` (the custom-element tag — meaningless without
  Lit). Add optional `stars: { three: number; two: number }` — required for
  every scored world, absent only for the garden epilogue.
- Build-time validation (hard fail, as today): star thresholds are non-negative
  integers with `three <= two`; every scored world has them; existing
  solvability validators are kept and extended to the ported `logic.ts`
  modules so **no world can ship unsolvable or unstarrable**.
- Link checker, one-directional references, broken-fixture-both-directions
  tests: unchanged in principle, updated for the schema.
- New achievements remain content-only (condition or predicate, exactly one).

## State v2, persistence, settings

- `GameState` v2 adds: `stars: Record<string, number>`,
  `earnedConcepts: string[]`, `seenPrologue: boolean`,
  `seenActCards: string[]`, `settings.soundOn: boolean` (default **false**).
  Everything else carries over.
- New events: `stars.awarded` (keeps the best per world),
  `concept.earned`, `prologue.seen`, `actCard.seen`. Sound uses the existing
  `settings.changed`.
- Migration v1→v2 fills defaults; unknown/corrupt saves still yield a fresh
  state, never a crash. `CURRENT_STATE_VERSION = 2`.
- `returnTo` (journal Back target) lives in the router bridge, not in
  persisted state — it resets to the map on reload.

## Verification

- `npm run check` keeps its shape: content check → typecheck → unit → build →
  e2e. CI deploys `dist/` to Pages; the content check still fails the deploy
  on broken references or unsolvable/unstarrable scenarios.
- **Logic unit tests:** every world's `logic.ts` is tested pure (no Phaser):
  solvability, metric accounting, star mapping. The ported scenario tests keep
  proving the checks in both directions with broken fixtures.
- **UI factory tests:** the focus-navigation model is a pure module and is
  unit-tested (order, wrapping, disabled skipping); in-canvas behavior is
  covered by e2e keyboard walks.
- **E2E (Playwright):** keyboard-driven walks of Thread and Wander, one solve
  per world, journal round-trip with Back, mode toggle from inside a world,
  skip path. A `?e2e=1`-gated `window.__satyrn` debug hook (seeded RNG, skipped
  animations, solve-step) makes runs deterministic; the hook does not exist
  without the flag.
- Accessibility checks in e2e: every scene reachable and operable keyboard-only;
  aria-live announcements fire on scene change, dialogue, and results.

## Delivery waves

Each wave is playable and deployable on its own; adding a world never touches
another world's files.

| Wave | Ship |
|---|---|
| **0 — Shell** | Boot/textures, theme, UI factory, focus manager, audio (off by default),
  layout manager, router bridge, HUD, Title/prologue, Map (both modes),
  Dialogue renderer, Journal overlay, Toasts, ActCards, state v2 + migration,
  aria-live bridge, e2e harness with `?e2e=1` |
| **1 — Prologue + Act I** | Lantern Room, Rain-Gauge, Aviary, Cartwright — each: logic, scene,
  metric, stars, e2e solve |
| **2 — Act II** | Round Path, Gate, Assayer — same per-world slice |
| **3 — Act III + epilogue** | Blueprint, Well, Garden — same slice, plus journey honors |
| **4 — Polish** | performance pass on low-end mobile, reduced-motion audit, juice/feel
  pass, sound-set review, docs |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Full canvas is an accessibility risk | keyboard-first UI factory, focus ring, aria-live narration,
  reduced-motion support, and e2e keyboard coverage are Wave 0, not garnish |
| Ten worlds is substantial scope | waves ship independently; logic-before-scene keeps each world small;
  content pipeline unchanged so authors keep working during the rebuild |
| In-code art could look cheap | one flat style, one palette, generated once; polish wave reserved |
| Mobile performance | DPR cap, particle budgets, texture reuse, low-end device pass in Wave 4 |
| Rewrite fatigue / half-migrated repo | Wave 0 deletes the Lit shell outright; no two-toolkit halfway state |

## Open questions (deferred, not blocking)

- Final app title treatment (working title stays *Satyrn — The Thread*).
- Whether ambient sound (beyond SFX) is wanted when sound is enabled.
- Exact star-threshold tuning per world — set during each world's wave from
  playtesting, validated by the build check.
