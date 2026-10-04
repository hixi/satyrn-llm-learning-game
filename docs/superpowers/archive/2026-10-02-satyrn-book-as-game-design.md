# Satyrn Book as Game — interactive learning game (design spec)

**Date:** 2026-10-02
**Status:** accepted — implementation follows in the companion plan
**Repo:** `satyrn-book-as-game` (new, empty, no remote)

## One line

A static, browser-only, GitHub Pages–deployed interactive learning game that
brings the world of Satyrn to life: the Wayfarer travels a Thread between small
handmade worlds, mending each one's machine, accompanied by the Satyrn (a small
local model that must be kept on track) and the Moon (a reflective journal that
asks for evidence).

## Goal

Teach Satyrn's world — AI systems, local models, agents and harnesses, the
snags (runaway loops, ambiguity, vanity metrics), spec-driven development,
local-vs-cloud, and open community — to **beginners first**, while remaining
fun for intermediate players. Each world teaches one idea through one bespoke
mechanic, with an optional deeper "engine room" for those who want more.

The audience and the deployment constraint come from the brief:

- **Audience:** beginners, but rewarding for intermediate players.
- **Deployment:** GitHub Pages. Browser-based only. No backend.
- **State:** progress and achievements live in the browser.
- **Structure:** chapters are independently selectable and skippable.

## Non-goals (explicitly out of v1)

- No backend, accounts, server, or database.
- No multiplayer or social features.
- No live model calls or inference at runtime; everything runs offline in the
  browser. The Satyrn is scripted, not an actual model.
- No analytics or telemetry.
- No localization (the structure allows it later; v1 is single-language).
- No PWA / offline service worker.
- No native mobile app. Responsive web only.
- No reuse of the purchased Triple Charm webfonts or other licensed assets from
  `satyrn-zen`. Art and display identity are original, inspired by the brand
  palette.

## Provenance and spirit

This is not an adaptation of *The Little Prince*. It borrows only the
**structure** of a traveler moving between tiny worlds, each encounter
revealing something. The characters, names, and lessons are Satyrn's own.

Source context, read before this design:

- `satyrn-zen` — the community learning site: concepts (AI systems, tokens,
  models, taxonomies, agents and harnesses, workflows, SDD, evaluation, trust),
  concrete how-tos (run a local model with Ollama, a coding agent in Docker,
  Open WebUI), and the vision ("reduce jargon so it is not a barrier";
  "education is a Python superpower").
- `satyrn-engine` — keeps a small local model on track so the developer stays at
  the wheel: contracts, bounded replacement, guardrails, candidate commits,
  receipts.
- `satyrn-evals` — proves the engine's claims from retained evidence: specs,
  oracle verdicts, the pathology census, the release-two comparison. Culture:
  "verify, don't assert"; "a refusal test has a sibling success test"; the
  developer does domain engineering (specs and tests), not agent engineering.

The design deliberately carries that culture into a game: every world teaches a
checkable idea, and the architecture is *automatically checked*.

## Decisions from brainstorming

### Cast

| Role | Name | Notes |
|---|---|---|
| Player | **the Wayfarer** | ungendered; the one at the wheel |
| Companion | **the Satyrn** | a small, curious, distractible horned woodland creature. It *is* the small local model: fast, smart, loses its place, wanders off task, repeats itself. The through-line is learning to keep it on track. |
| Companion | **the Moon** | belongs to the Wayfarer. Reflects what the Lantern lit and remembers the journey (the journal). Counterweight to the Satyrn: where the Satyrn proposes a plausible answer, the Moon asks "how would we know that's true?" (A + B combined.) |

Keepers are titled roles, ungendered or female-leaning. No character is
written as male.

### Frame

- **The Thread** — the path linking the small worlds. The recommended journey.
- **Beads** — the small worlds themselves. Each is a handmade system, built by
  its Keeper to solve a problem, now running slightly wrong.
- **The Lantern** — given in the prologue. It lights **only what the Wayfarer
  attends to**, and whatever is lit is all the system knows. The game's central
  metaphor for what a model actually sees.
- **The Satyrn** — companion and the small model.
- **The Moon** — journal and counterweight.

### World map (prologue + nine Beads)

Each Bead has a **surface layer** (beginner: story, one clear idea, one
mechanic) and an optional **engine room** (intermediate: the same idea at full
depth, feeding achievements).

**Prologue — The Lantern Room.** Keeper: the Satyrn. Idea: **attention; what is
lit is all it knows.** Mechanic: direct the lantern in a dark workshop;
observe that only the lit part exists to the Satyrn.

**Act I — The Making** (what an AI system is)

1. **The Rain-Gauge Terrace.** Keeper: **the Waterwarden**. Idea: **tokens and
   context.** Mechanic: catch rain as drops, pour them into a fixed-size cup,
   watch it overflow, and feel what spilling costs. The finite cup is the
   context window.
2. **The Aviary of Whispers.** Keeper: **the Birdwright**. Idea: **models and
   their taxonomy.** Mechanic: different birds do different errands
   (small/fast vs large/careful); match creature to task and learn why one size
   does not fit all.
3. **The Cartwright's Yard.** Keeper: **the Cartwright**. Idea: **agents and
   harnesses.** Mechanic: rig a cart — the harness: tools, loop, limits — so the
   horse — the model — reaches the market without bolting. Build the driving
   loop rather than drive it.

**Act II — The Snags** (where it goes wrong)

4. **The Round Path.** Keeper: **the Miller**. Idea: **runaway loops.**
   Mechanic: the mule walks the same circle all night; spot the repeating
   pattern and break it *without* stopping the useful work. (Grounded in the
   engine's real 245-call loop.)
5. **The Gate of Orders.** Keeper: **the Gatekeeper**. Idea: **instructions,
   constraints, ambiguity.** Mechanic: write standing orders a perfectly literal
   gate will obey, and find the wording that survives every edge case.
   Prompting as engineering.
6. **The Assayer's Scale.** Keeper: **the Assayer**. Idea: **evaluation; vanity
   vs evidence.** Mechanic: the gleaming scale says everything is excellent;
   catch the flattering reading, build a check that can actually fail, and find
   what is truly sound. ("Verify, don't assert.")

**Act III — The Method and the Commons**

7. **The Blueprint and the Mason.** Keepers: **the Draughtswoman** and **the
   Mason**. Idea: **spec-driven development.** Mechanic: turn a drawing into
   measurements the Mason can run and verify; a spec no one can check cannot
   build anything. Contracts, made tangible.
8. **The Well and the Pipe.** Keeper: **the Well-Digger** (and the
   pipe-renter). Idea: **local vs cloud.** Mechanic: route the day's needs
   between your own well and a pipe to a distant lake — ownership, privacy,
   cost, and control each pull a different way.
9. **The Commons Garden.** Keeper: **everyone.** Idea: **community, sharing,
   open contribution.** Mechanic: plant your own Bead and wander others' — the
   world registry turned into a garden. The epilogue, where extensibility
   becomes the ending.

### Modes

Two modes over the **same** Bead parts; the mode changes framing, not content:

- **Thread mode** — guided; the Moon narrates the recommended order. Serves
  beginners who want a journey.
- **Wander mode** — drop into any Bead at any time. Serves intermediates and
  satisfies "selectable and skippable" directly.

Every Bead is always enterable. Nothing is locked.

## Architecture

### Rendering approach

**Hybrid: DOM/SVG by default, Canvas only where a mechanic earns it (option C
from brainstorming).** The world shell, dialogue, journal, map, and most puzzles
are accessible, testable DOM/SVG built with **Lit** web components. A named few
mechanics — rain/tokens, the spinning world, the Round Path — may use a small
canvas layer behind the documented mechanic contract.

The caveat inherited from option B is owned and contained: a canvas mechanic is
harder to make accessible and harder to unit-test, so that cost is confined to
the mechanic and never leaks into the shell. Every mechanic must declare an
accessible path (see **Mechanic contract**).

### Platform

- **Vanilla page + Lit web components + Vite.**
- **Hash-based routing** — avoids GitHub Pages 404 problems and needs no server
  rewrite configuration.
- A small **event-bus store**; components subscribe. No SPA framework.
- Lit is chosen because it makes independently replaceable parts a **property of
  the platform** (custom elements with encapsulated markup and styles), not a
  promise in a document.

### The parts model (replaceability requirement)

A **part** is one of: `world`, `mechanic`, `character`, `concept` (glossary),
`achievement`, `dialogue`, `thread`, or `string` set.

Every part has a globally unique, stable **ID** in a namespace:

```
world.rain-gauge      mechanic.pour-raindrops
character.waterwarden achievement.first-light
concept.tokens        dialogue.waterwarden.intro
thread.main
```

- **Structure** — IDs, wiring, order, prerequisites, mechanic bindings — lives
  in typed TS manifests under `content/`.
- **Content** — prose, dialogue, glossary entries, hints — lives in
  Markdown/YAML validated by schema.
- **References are one-directional.** A world may reference concepts,
  characters, and a mechanic; those parts never point back into a world.
  Achievements reference worlds/events; worlds never reference achievements.
  This forbids cycles and is what makes any part swappable.
- A build-time **link linter** resolves every reference: no dangling references,
  no duplicate IDs, no cycles, and every world reachable from Thread or Wander.

**Broken-reference policy (option C):**

- **Local dev:** warnings only, and the game shows a visible placeholder at the
  dangling site — e.g. "unreachable — dangling reference to `concept.tokens`".
- **Build/deploy:** **hard fail** on any dangling/duplicate/cyclic reference.
- `--allow-dangling` exists for debugging and is **never** passed by the deploy
  workflow.

### Runtime components

| Element | Responsibility |
|---|---|
| `satyrn-app` | shell, Thread/Wander mode switch, hash routing |
| `satyrn-store` | state, events, achievement evaluation, save/load, migrations, export/import/reset |
| `satyrn-dialogue` | data-driven dialogue nodes, choices, conditions; used for Keepers and companion banter |
| `satyrn-companion` / `satyrn-moon` | companion presenters (the Satyrn's proposals; the Moon's reflection and memory) |
| `satyrn-journal` | the Moon's memory: visited Beads, achievements, dev diagnostics |
| `satyrn-map` | Bead selection / Thread progress |
| `satyrn-mechanic-<id>` | one element per world's bespoke mechanic (implementation in `src/mechanics/<id>/`; its content manifest in `content/mechanics/<id>/`) |

### Mechanic contract (the swappable unit)

Every mechanic is a Lit custom element implementing a documented interface:

1. It is **mounted with a read-only context**: its own content, the store's read
   API, and the companion/dialogue API. It cannot reach into another mechanic.
2. It **emits typed events**: `mechanic:progress`, `mechanic:complete`,
   `mechanic:evidence`. The last records *how* the player solved it — evidence
   over assertion — and is what achievements read.
3. It **declares an accessible alternative**: keyboard operation,
   reduced-motion behavior, a screen-reader description, and a
   **"continue without playing"** path so no one is ever stuck.
4. It **owns its own styles** (shadow DOM) and imports nothing from another
   mechanic.
5. A mechanic is replaceable by dropping in a new element with the same
   interface and changing one manifest line.

## Achievements and persistence

- Achievements are **data**, not code: declarative conditions over a small event
  vocabulary (`mechanic.completed`, `world.engineRoom.completed`,
  `evidence.submitted`, counts, sequences).
- Anything exotic registers a **code predicate through the same documented seam
  used for testing** — one seam, not two.
- Achievements reward three things distinctly:
  1. completing the intended lesson;
  2. **skipping** — honestly a feature, with its own acknowledgement, not a
     cheat;
  3. **engine-room** depth.
- State is **versioned with migrations**, so a save from an earlier release
  still loads.
- The journal offers **export / import / reset**.
- Storage is `localStorage`, namespaced by app id.

## Verification ("checked automatically")

- **Content schema tests** — every part validates against its schema.
- **Link-graph tests** — dangling, duplicate, cycle, and reachability checks.
  Each check has a **deliberately broken fixture that must fail**, so the checks
  are proven in both directions.
- **Unit tests** — store, migrations, achievement predicates, dialogue
  conditions, router.
- **Mechanic contract tests** — every registered mechanic satisfies the
  interface and exposes an accessible path.
- **Smoke e2e** — a headless browser walks the Thread and enters each Bead;
  fails if any Bead throws.
- One command (working name `npm run check`) runs the whole local suite —
  content schema, link graph, unit, mechanic contract, and smoke e2e. CI runs
  it on every push and gates deploy.

## Deployment

- GitHub Actions builds with Vite using the correct `base` for the Pages path
  and deploys `dist/` to Pages.
- Hash routing means no 404 rewrite rules.
- No runtime network dependency; fonts and art are self-hosted original assets.
- The deploy workflow never passes `--allow-dangling`.

## Delivery waves

Each wave is playable and deployable on its own. Adding a Bead later never
requires touching another Bead's files.

| Wave | Ship |
|---|---|
| **Wave 0 — Frame** | shell, router, store, companions, dialogue system, reference checker, and one Bead end-to-end (Prologue) |
| **Wave 1 — Act I** | three Beads proving three different mechanic shapes (data-flow, classification, build-a-loop) |
| **Wave 2 — Act II** | three Beads (pattern-breaking, constraint-writing, evaluation) |
| **Wave 3 — Act III + epilogue** | spec-building, local-vs-cloud routing, the Commons Garden |

## Repo layout (sketch)

```
src/            app shell, store, dialogue, components, mechanics/<id>/  (code)
content/        worlds/, mechanics/, concepts/, characters/, achievements/,
                threads/, strings/  (data manifests + prose)
tools/          check-content, link-linter, schemas/
tests/          unit/ e2e/ fixtures/
docs/superpowers/specs/   this design
.github/workflows/        build + Pages deploy
```

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Canvas mechanics are an accessibility/testability soft spot | contained by the mechanic contract; accessible path is mandatory |
| Nine worlds is substantial content scope | delivered in waves; each Bead independently shippable |
| Content schema churn as authors learn | versioned content schema with migrations; data over code |
| Part replacement silently breaking references | one-directional references + build-time link linter + both-direction tests |
| A contributor cannot preview mid-edit | dev warns and shows in-game placeholders; only build/deploy is strict |

## Open questions (deferred, not blocking)

- Final app name and title treatment (working title: *Satyrn Book as Game*).
- Whether the Thread narration is voiced by the Moon or a narrator framing.
- Exact art direction and display font (original, brand-inspired).
- Which mechanics get a canvas layer; decided per Bead during its wave.
- Whether an "engine room" is a mode toggle or a spatially separate room in each
  Bead.