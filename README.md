# Satyrn — The Thread

An interactive, browser-based learning game that brings the world of
[Satyrn](https://satyrn-ai.com) to life. You are the **Wayfarer**, walking a
thread between ten small handmade worlds. Each world holds a small system built
by its keeper — a cup that overflows, an aviary of mismatched birds, a cart that
will not stop — and you learn how it works by working with it.

The game takes the *spirit* of a traveller moving between tiny worlds — the
structure, not the story — and turns it into Satyrn's own fiction. It teaches AI
literacy first, then the Satyrn method, then the community.

- **Beginners** get one clear idea per world, in plain language, with no jargon
  barrier.
- **Intermediate players** get an idea worth thinking about: how a small local
  model loses its place, why evidence beats a flattering reading, and what it
  means to keep the human at the wheel.

## Play

No backend, no accounts, no network calls. Everything runs in the browser and
your progress stays in your own `localStorage`. The production bundle is a
single self-contained `dist/index.html` (JS + CSS inlined).

```sh
npm install
npm run dev
```

Then open the address Vite prints. For a production build:

```sh
npm run build      # bundle into dist/
```

The repository ships a GitHub Actions workflow that deploys `dist/` to
**GitHub Pages** on every push to `main`
(`https://<owner>.github.io/<repo>/`). Routing is hash-based, so it needs no
server rewrite rules. Tests and type check run locally (`npm run check`), not
in CI.

## The world

| Act | Bead | Keeper | Idea |
|---|---|---|---|
| Prologue | **The Lantern Room** | the Satyrn | attention — what you light is all it knows |
| I — The Making | **The Rain-Gauge Terrace** | the Waterwarden | tokens and the context window |
| | **The Aviary of Whispers** | the Birdwright | models and taxonomy |
| | **The Cartwright's Yard** | the Cartwright | agents and harnesses |
| II — The Snags | **The Round Path** | the Miller | runaway loops |
| | **The Gate of Orders** | the Gatekeeper | instructions, constraints, ambiguity |
| | **The Assayer's Scale** | the Assayer | evaluation — evidence over vanity |
| III — The Method and the Commons | **The Blueprint and the Mason** | the Draughtswoman & the Mason | spec-driven development |
| | **The Well and the Pipe** | the Well-Digger | local vs cloud |
| | **The Commons Garden** | the Gardener | community and contribution |

Your companions are the **Satyrn** — the small local model, quick and curious
and easily distracted, the one you are learning to keep on track — and the
**Moon**, your journal and your counterweight, who asks how you could know
something is true.

Every world has its own mechanic: light the lantern's corners, pour raindrops
into a fixed cup, match birds to errands, rig a cart so the horse arrives *and
stops*, spot the mule's repeating circle, write an order a literal gate will
obey, refuse a scale that cannot fail, turn a drawing into a spec, route the day
between your own well and a shared pipe, and plant a Bead of your own in the
commons.

## Features

- **Ten worlds, ten distinct mechanics** — no two play the same way.
- **Freely selectable and skippable.** Every Bead is enterable at any time, and
  every mechanic has a *Continue without playing* path, so no one is ever stuck.
- **Keyboard-first.** Every mechanic is completable with the keyboard alone;
  any sound is off until you ask for it.
- **Achievements distinguish the honest outcomes:** solving a world's lesson,
  skipping it with *Continue without playing* (recorded and acknowledged — and
  it does **not** grant the lesson), and completing the journey by planting a
  Bead in the commons.
- **Your progress is yours.** Versioned save state with migrations, plus
  export, import, and reset in the journal.
- **No accounts, no tracking, no ambient network.**

## How it is built

TypeScript, [Vite](https://vite.dev), and plain DOM — no game engine, no UI
framework. A small event-bus store and a hash router; the page is the UI.

The design goal is that **every part is independently replaceable** — a world,
a mechanic, a concept, an achievement — and that an LLM can rebuild any part
from one file without understanding the rest.

- **Content is TypeScript.** Worlds, concepts, characters, achievements, and
  dialogues live as one frozen bundle in `src/content/content.ts`, typed by
  `src/content/types.ts`. Edit the bundle directly; `tsc` checks every
  reference.
- **Every mechanic's logic is a pure module** (`src/game/worlds/<id>/logic.ts`):
  scenario parsing and validation beside the world's rules, importable with
  zero DOM. The view layer (`src/views/mechanics/<id>.ts`) renders over it.
- **Views are store-driven and idempotent.** A view is
  `render(host, ctx, …): void`, reads store state, and clears only its own
  host. Completing a mechanic dispatches store events; the solved state renders
  via a store subscription — never a full page re-render, so in-progress picks
  survive. The HUD re-renders on every event; the main view only on navigation.
- **Tests run in jsdom, no browser.** `npm run check` is `tsc --noEmit`,
  `vitest run` (logic + direct view renders + `.click()`), and `vite build`.
  About two seconds, no server.

```
src/content/   frozen content bundle + types (edit here)
src/game/      audio, announce, pure world logic (<id>/logic.ts)
src/store/     event-bus store, state, achievements, persistence
src/ui/        tiny DOM helpers, dialogue renderer, toasts
src/views/     shell (title/map/journal), world, mechanics/<id>.ts
tests/         unit, content, mechanic, and view tests (Vitest + jsdom)
```

## Development

```sh
npm run dev        # Vite dev server
npm run typecheck  # tsc --noEmit
npm test           # unit and view tests (Vitest + jsdom)
npm run check      # everything: typecheck, unit, build
```

## Contributing a world

A new Bead is:

1. an entry in `src/content/content.ts` (world + concepts + mechanic `params`),
2. a logic module in `src/game/worlds/<id>/logic.ts` (pure, DOM-free),
3. a view in `src/views/mechanics/<id>.ts` (DOM over the logic),
4. a line in `src/game/worlds/scenarios.ts` (validator table),
5. an entry in the `thread.main` sequence.

`npm run check` must be green.

## License

Apache-2.0 — see [LICENSE](LICENSE). Copyright 2026 Nicola Jordan.
