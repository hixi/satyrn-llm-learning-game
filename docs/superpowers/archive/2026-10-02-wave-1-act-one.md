# Wave 1 — Act I (The Making): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three Act I Beads — the Rain-Gauge Terrace (tokens/context), the Aviary of Whispers (models/taxonomy), and the Cartwright's Yard (agents/harnesses) — each with a bespoke mechanic, content, achievements, and an e2e walk.

**Architecture:** Adds three `MechanicElement`s behind the Wave 0 contract, each reading its scenario from the mechanism's `params` (content-driven, so authors can retune a puzzle without touching code). Each task adds one mechanic and its content together, so the link checker and the "every content mechanic is registered" contract test stay green at every task boundary.

**Tech Stack:** unchanged from Wave 0 — TypeScript, Vite, Lit 3, Vitest (+ jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-satyrn-book-as-game-design.md` (world map; each Bead teaches one idea through one bespoke mechanic, with an optional engine room).

## Global Constraints

- Every mechanic implements `MechanicElement`: `setContext`, `emitProgress`/`emitComplete`/`emitEvidence`, `renderFallback`, and a `static accessibilityDescription`. It owns its styles and imports no other mechanic.
- Every mechanic is completable by keyboard alone and has a working "Continue without playing" control (`data-fallback`).
- Scenario data lives in `params` on the mechanic's content YAML; each mechanic parses it defensively and falls back to a default scenario when absent or malformed. A bad `params` block must never throw.
- Each world is added to `content/threads/main.yaml` in the same task it is created, so no world is ever unreachable.
- Achievements are data; a new achievement's condition references only events that already exist.
- No new dependencies. No network at runtime.
- `npm run check` (strict content + unit + build + e2e) stays green at every task boundary.

## Review Focus

1. **Malformed or absent `params`.** Expected: the mechanic renders a playable default scenario; never throws. (Tasks 1–3)
2. **Every Bead completes by keyboard alone and via the fallback.** Expected: both paths emit `mechanic.completed` and `evidence.submitted`. (Tasks 1–3)
3. **A world added but not threaded.** Expected: `npm run check:content` fails with `unreachable`. (Tasks 1–3, each adds to the thread)
4. **A mechanic whose scenario is unsolvable as authored.** Expected: a test proves the authored content's scenario is solvable, not just a hand-built fixture. (Tasks 1–3)
5. **Assignments that look right but violate a constraint (two tasks on one bird; essentials exceeding cup capacity).** Expected: the mechanic rejects them. (Tasks 1–2)

---

## File Structure

```
content/
  characters/waterwarden.yaml  birdwright.yaml  cartwright.yaml
  concepts/tokens.yaml  context-window.yaml  models.yaml  taxonomy.yaml
           agent.yaml  harness.yaml
  mechanics/rain-gauge.yaml  aviary.yaml  cartwright.yaml
  worlds/rain-gauge-terrace.yaml  aviary-of-whispers.yaml  cartwrights-yard.yaml
  achievements/*.yaml  dialogues/*.yaml  threads/main.yaml (modified)
src/mechanics/
  rain-gauge/rain-gauge.ts  aviary/aviary.ts  cartwright/cartwright.ts
  registry.ts (modified, one line per mechanic)
tests/mechanics/
  rain-gauge.test.ts  aviary.test.ts  cartwright.test.ts  act-one.test.ts
tests/e2e/act-one.spec.ts
```

Every mechanic uses a shared test helper (added in Task 1, `tests/mechanics/helper.ts`) that mounts a mechanic with an `applyEvent`-backed store and records emitted events.

---

### Task 1: Rain-Gauge Terrace — tokens and the context window

**Files:**
- Create: `content/characters/waterwarden.yaml`, `content/concepts/tokens.yaml`, `content/concepts/context-window.yaml`, `content/mechanics/rain-gauge.yaml`, `content/worlds/rain-gauge-terrace.yaml`, `content/achievements/steady-hand.yaml`, `content/dialogues/waterwarden-intro.yaml`
- Create: `src/mechanics/rain-gauge/rain-gauge.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/helper.ts`, `tests/mechanics/rain-gauge.test.ts`

**Interfaces:**
- Produces: `mechanic-rain-gauge` element; `tests/mechanics/helper.ts` exporting `mountMechanic(tag: string, mechanicId: string, worldId: string, params?: Record<string, unknown>)` returning `{ el, events }`. When `params` is given it replaces the content mechanic's `params` for that mount (so tests can inject malformed or custom scenarios).
- Scenario param shape: `{ capacity: number; drops: { id: string; label: string; essential: boolean }[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/rain-gauge.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.rain-gauge'].params as any;

describe('rain gauge', () => {
  it('is completable by keyboard from the authored scenario', async () => {
    const { el, events } = mountMechanic('mechanic-rain-gauge', 'mechanic.rain-gauge', 'world.rain-gauge-terrace', authored);
    await el.updateComplete;
    for (const drop of authored.drops) {
      const keep = drop.essential;
      el.decide(drop.id, keep);
    }
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('does not complete while a distractor fills the cup', async () => {
    const { el, events } = mountMechanic('mechanic-rain-gauge', 'mechanic.rain-gauge', 'world.rain-gauge-terrace', authored);
    await el.updateComplete;
    for (const drop of authored.drops) el.decide(drop.id, true);
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-rain-gauge', 'mechanic.rain-gauge', 'world.rain-gauge-terrace', { capacity: 'nope' });
    await el.updateComplete;
    expect(el.drops.length).toBeGreaterThan(0);
    expect(el.capacity).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-rain-gauge', 'mechanic.rain-gauge', 'world.rain-gauge-terrace', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/rain-gauge.test.ts`
Expected: FAIL — cannot resolve `./helper` and `mechanic-rain-gauge` is not defined.

- [ ] **Step 3: Write the shared test helper**

```ts
// tests/mechanics/helper.ts
import { createInitialState, applyEvent } from '../../src/store/state';
import { getContent } from '../../src/content';
import type { MechanicContext } from '../../src/mechanics/context';

export function mountMechanic(tag: string, mechanicId: string, worldId: string, params?: Record<string, unknown>) {
  const el: any = document.createElement(tag);
  const events: any[] = [];
  let state = createInitialState();
  const content = getContent();
  const base = content.mechanics[mechanicId];
  const context: MechanicContext = {
    mechanic: params === undefined ? base : { ...base, params },
    world: content.worlds[worldId],
    content: { getConcept: (id) => content.concepts[id], getCharacter: (id) => content.characters[id] },
    store: {
      getState: () => state,
      subscribe: () => () => {},
      dispatch: (e) => { events.push(e); state = applyEvent(state, e); },
    },
    dialogue: { open: () => {} },
  };
  el.setContext(context);
  document.body.append(el);
  return { el, events };
}
```

- [ ] **Step 4: Author the content**

`content/characters/waterwarden.yaml`: `id: character.waterwarden`, `name: the Waterwarden`, `title: keeper of the terrace`, `description` — she measures every drop, because the cup is small and the season is long.
`content/concepts/tokens.yaml`: `concept.tokens` — a token is a unit of text a model processes; models are billed and bounded by them.
`content/concepts/context-window.yaml`: `concept.context-window` — the finite cup; everything a model is shown must fit, and what does not fit is not known.
`content/mechanics/rain-gauge.yaml`: `id: mechanic.rain-gauge`, `element: mechanic-rain-gauge`, title/description/a11y, and `params` with `capacity: 5` and eight drops of which five are `essential: true` (e.g. `seed`, `root`, `shoot`, `bloom`, `harvest`) and three distractors (`chatter`, `rumour`, `echo`).
`content/worlds/rain-gauge-terrace.yaml`: `id: world.rain-gauge-terrace`, `act: act1`, `order: 1`, keeper `character.waterwarden`, concepts `[concept.tokens, concept.context-window]`, mechanic `mechanic.rain-gauge`, a summary and intro.
`content/achievements/steady-hand.yaml`: kind `lesson`, condition `{ event: 'mechanic.completed', mechanic: 'mechanic.rain-gauge' }`.
`content/dialogues/waterwarden-intro.yaml`: speaker `character.waterwarden`, one gated choice (as in the prologue's dialogue).
`content/threads/main.yaml`: append `world.rain-gauge-terrace` to `sequence`.

- [ ] **Step 5: Implement `src/mechanics/rain-gauge/rain-gauge.ts`**

Element `mechanic-rain-gauge`. Parse `params` defensively: `capacity` is a positive integer else 5; `drops` is an array of `{ id: string, label: string, essential: boolean }` else a built-in default. Expose `drops`, `capacity`, and a public `decide(id: string, keep: boolean): void`. State: `kept: string[]`, `decided: string[]`, `completed: boolean`.

Rules: `keep` on a drop already decided is a no-op; `keep` when `kept.length === capacity` is a no-op (the cup is full — the whole lesson); after processing every drop, if `kept` contains exactly the essential drops, `emitEvidence({ kept, spilled, usedFallback: false })` then `emitComplete()`; if not, `spilled` is shown and the player may press "Try again" which resets `kept`/`decided`/`completed` (no completion event). `emitProgress` reports `decided.length / drops.length`. Render each drop with a label and two buttons ("Keep", "Let fall") disabled once decided or when the cup is full for Keep; show the cup's contents and the capacity. `renderFallback()` describes the puzzle; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 6: Register the mechanic**

In `src/mechanics/registry.ts`, import and `defineMechanic('mechanic.rain-gauge', MechanicRainGauge, 'mechanic-rain-gauge')` inside `registerMechanics()`.

- [ ] **Step 7: Run the tests and the content check**

Run: `npx vitest run tests/mechanics/rain-gauge.test.ts && npm run check:content`
Expected: PASS, and `content OK` (the new world is reachable from the thread; every reference resolves).

- [ ] **Step 8: Commit**

```bash
git add content src/mechanics/rain-gauge src/mechanics/registry.ts tests/mechanics/helper.ts tests/mechanics/rain-gauge.test.ts
git commit -m "feat: add the Rain-Gauge Terrace mechanic"
```

---

### Task 2: Aviary of Whispers — models and taxonomy

**Files:**
- Create: `content/characters/birdwright.yaml`, `content/concepts/models.yaml`, `content/concepts/taxonomy.yaml`, `content/mechanics/aviary.yaml`, `content/worlds/aviary-of-whispers.yaml`, `content/achievements/right-bird.yaml`, `content/dialogues/birdwright-intro.yaml`
- Create: `src/mechanics/aviary/aviary.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/aviary.test.ts`

**Interfaces:**
- Produces: `mechanic-aviary` element with public `assign(taskId: string, birdId: string): void` and `birds` / `tasks`.
- Scenario param shape: `{ birds: { id: string; name: string; traits: string[] }[]; tasks: { id: string; label: string; needs: string[] }[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/aviary.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.aviary'].params as any;

describe('aviary', () => {
  it('completes when every task is assigned a distinct suitable bird', async () => {
    const { el, events } = mountMechanic('mechanic-aviary', 'mechanic.aviary', 'world.aviary-of-whispers', authored);
    await el.updateComplete;
    el.solve(); // assigns the authored matching
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('rejects reusing one bird for two tasks', async () => {
    const { el, events } = mountMechanic('mechanic-aviary', 'mechanic.aviary', 'world.aviary-of-whispers', authored);
    await el.updateComplete;
    const [t1, t2] = el.tasks;
    const bird = authored.birds[0].id;
    el.assign(t1.id, bird);
    el.assign(t2.id, bird);
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
    expect(el.conflicts().length).toBe(1);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-aviary', 'mechanic.aviary', 'world.aviary-of-whispers', { birds: 'nope' });
    await el.updateComplete;
    expect(el.birds.length).toBeGreaterThan(0);
    expect(el.tasks.length).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-aviary', 'mechanic.aviary', 'world.aviary-of-whispers', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/aviary.test.ts`
Expected: FAIL — `mechanic-aviary` is not defined.

- [ ] **Step 3: Author the content**

`character.birdwright` — she keeps birds of every temperament; `concept.models`, `concept.taxonomy` — models differ by kind and cost, and naming those kinds is how you choose; `mechanic.aviary` with `params.birds` (three birds with disjoint-ish `traits`, e.g. `swift`+`small`, `patient`+`careful`, `vast`+`careful`) and `params.tasks` (three tasks whose `needs` each match exactly one bird, so the matching is unique); `world.aviary-of-whispers` (`act1`, order 2, keeper `character.birdwright`, concepts the two above); `achievement.right-bird` (lesson, `mechanic.completed` on `mechanic.aviary`); `dialogue.birdwright.intro`; append the world to the thread.

- [ ] **Step 4: Implement `src/mechanics/aviary/aviary.ts`**

Parse `params` defensively into `birds` (`{ id, name, traits: string[] }`) and `tasks` (`{ id, label, needs: string[] }`), each with a built-in default. Expose `birds`, `tasks`, `assign(taskId, birdId)`, `conflicts(): { taskIds: string[]; birdId: string }[]`, and `solve()` (assigns each task its unique matching bird — used by tests and the "show me" hint). `assign` overwrites that task's prior choice; a `conflicts` entry exists when a bird is assigned to more than one task. A task is satisfied when every `need` is in the bird's `traits`. When every task is satisfied, every bird used at most once, and all tasks assigned: `emitEvidence({ assignments, usedFallback: false })` then `emitComplete()`. Render each task as a labelled `<select>` of birds plus a per-task satisfied indicator; render conflicts. `emitProgress` reports satisfied tasks over total.

- [ ] **Step 5: Register and verify**

Register `mechanic.aviary`; run `npx vitest run tests/mechanics/aviary.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/aviary src/mechanics/registry.ts tests/mechanics/aviary.test.ts
git commit -m "feat: add the Aviary of Whispers mechanic"
```

---

### Task 3: Cartwright's Yard — agents and harnesses

**Files:**
- Create: `content/characters/cartwright.yaml`, `content/concepts/agent.yaml`, `content/concepts/harness.yaml`, `content/mechanics/cartwright.yaml`, `content/worlds/cartwrights-yard.yaml`, `content/achievements/rigged-right.yaml`, `content/dialogues/cartwright-intro.yaml`
- Create: `src/mechanics/cartwright/cartwright.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/cartwright.test.ts`

**Interfaces:**
- Produces: `mechanic-cartwright` element with public `setSlot(slotId: string, componentId: string): void`, `run(): 'success' | 'overshot' | 'ran-out' | 'no-work'`, and exposed `slots` / `components` / `goal`.
- Scenario param shape: `{ goal: number; slots: { id: string; label: string }[]; components: { id: string; name: string; type: 'work' | 'limit' | 'verify' | 'distraction'; power?: number; limit?: number }[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/cartwright.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.cartwright'].params as any;
const byType = (t: string) => authored.components.find((c: any) => c.type === t);

describe('cartwright', () => {
  it('reaches the market and stops with work, limit and verify fitted', async () => {
    const { el, events } = mountMechanic('mechanic-cartwright', 'mechanic.cartwright', 'world.cartwrights-yard', authored);
    await el.updateComplete;
    el.setSlot('work', byType('work').id);
    el.setSlot('limit', byType('limit').id);
    el.setSlot('check', byType('verify').id);
    expect(el.run()).toBe('success');
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('bolts past the market without a verifier', async () => {
    const { el, events } = mountMechanic('mechanic-cartwright', 'mechanic.cartwright', 'world.cartwrights-yard', authored);
    await el.updateComplete;
    el.setSlot('work', byType('work').id);
    el.setSlot('limit', byType('limit').id);
    expect(el.run()).toBe('overshot');
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('runs out of road without a limit', async () => {
    const { el } = mountMechanic('mechanic-cartwright', 'mechanic.cartwright', 'world.cartwrights-yard', authored);
    await el.updateComplete;
    el.setSlot('work', byType('work').id);
    el.setSlot('check', byType('verify').id);
    expect(el.run()).toBe('ran-out');
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-cartwright', 'mechanic.cartwright', 'world.cartwrights-yard', { goal: 'x' });
    await el.updateComplete;
    expect(el.slots.length).toBeGreaterThan(0);
    expect(el.components.length).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-cartwright', 'mechanic.cartwright', 'world.cartwrights-yard', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/cartwright.test.ts`
Expected: FAIL — `mechanic-cartwright` is not defined.

- [ ] **Step 3: Author the content**

`character.cartwright` — she builds the cart and, more importantly, the rig that keeps the horse on the road; `concept.agent` (a model with tools, memory, and the ability to act), `concept.harness` (the rig around the model: the loop, the limits, the checks); `mechanic.cartwright` with `params.goal: 8`, slots `work`/`limit`/`check`, and components: a `work` component (`power: 2`), a `limit` component (`limit: 12`), a `verify` component, and distractors (`type: 'distraction'`) that occupy a slot but do nothing useful. Ensure the authored puzzle is solvable: `work.power * limit >= goal` and `goal % work.power === 0`; add a test-visible invariant (Step 1 already proves it). `world.cartwrights-yard` (`act1`, order 3); `achievement.rigged-right`; `dialogue.cartwright.intro`; append the world to the thread.

- [ ] **Step 4: Implement `src/mechanics/cartwright/cartwright.ts`**

Parse `params` defensively into `goal` (positive number else 8), `slots` (non-empty array else a default of `work`/`limit`/`check`), and `components` (non-empty array else a default set matching the authored one). Expose `slots`, `components`, `goal`, `setSlot(slotId, componentId)`, and `run()`.

`run()` semantics (pure, deterministic, no timers). Success requires all three: a work tool, a verifier, and a limit.
1. The `work` slot's component must have `type === 'work'`; otherwise return `'no-work'`.
2. Without a verifier in the `check` slot, the cart never knows it arrived: return `'overshot'` if `work.power * 40 >= goal`, else `'ran-out'`.
3. With a verifier but no limit, it knows it arrived but nothing ends the loop: return `'ran-out'`.
4. With a verifier and a limit: `max = limit`, `pos = 0`; for `i` in `0..max`: `pos += power`; if `pos >= goal` return `'success'`. Otherwise return `'ran-out'`.

On `'success'`, `emitEvidence({ result: 'success', usedFallback: false })` then `emitComplete()`. Render one `<select>` per slot, a "Send the cart" button, and the last result in words. `emitProgress` reports fitted-slot count over total before a run.

- [ ] **Step 5: Register and verify**

Register `mechanic.cartwright`; run `npx vitest run tests/mechanics/cartwright.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/cartwright src/mechanics/registry.ts tests/mechanics/cartwright.test.ts
git commit -m "feat: add the Cartwright's Yard mechanic"
```

---

### Task 4: Act I integration test and e2e walk

**Files:**
- Create: `tests/mechanics/act-one.test.ts`, `tests/e2e/act-one.spec.ts`
- Modify: `tests/e2e/thread.spec.ts` (only if the journal text changes)

**Interfaces:**
- Consumes: all three mechanics and all Wave 0 components.

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/mechanics/act-one.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics, registeredMechanics, registeredMechanicElement } from '../../src/mechanics/registry';
import { validateContent } from '../../tools/content/validate';
import { loadRawContent } from '../../tools/content/load';

registerMechanics();

describe('Act I', () => {
  it('has three Beads in act1, in order, each with a distinct mechanic', () => {
    const worlds = Object.values(getContent().worlds).filter((w) => w.act === 'act1').sort((a, b) => a.order - b.order);
    expect(worlds.map((w) => w.order)).toEqual([1, 2, 3]);
    const tags = worlds.map((w) => registeredMechanicElement(w.mechanic));
    expect(tags.every(Boolean)).toBe(true);
    expect(new Set(tags).size).toBe(3);
  });

  it('every Act I mechanic is registered and content validates', () => {
    const content = validateContent(loadRawContent('content'));
    for (const world of Object.values(content.worlds).filter((w) => w.act === 'act1')) {
      expect(registeredMechanics()).toContain(world.mechanic);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails or passes**

Run: `npx vitest run tests/mechanics/act-one.test.ts`
Expected: PASS if Tasks 1–3 are complete. If it fails, the failure names the missing world or mechanic — fix that before continuing.

- [ ] **Step 3: Write the e2e walk**

```ts
// tests/e2e/act-one.spec.ts
import { test, expect } from '@playwright/test';

const FALLBACK = '[data-fallback]';

test('walks all three Act I Beads', async ({ page }) => {
  for (const slug of ['rain-gauge-terrace', 'aviary-of-whispers', 'cartwrights-yard']) {
    await page.goto(`/#/world/world.${slug}`);
    await expect(page.locator('satyrn-world')).toBeVisible();
    await page.locator(`satyrn-world mechanic-${slug === 'rain-gauge-terrace' ? 'rain-gauge' : slug === 'aviary-of-whispers' ? 'aviary' : 'cartwright'} ${FALLBACK}`).click();
  }
  await page.goto('/#/journal');
  await expect(page.locator('satyrn-moon')).toContainText(/Steady Hand/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Right Bird/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Rigged Right/i);
});
```

- [ ] **Step 4: Run the full gate**

Run: `npm run check`
Expected: strict content check, all unit tests, build, and both e2e specs pass.

- [ ] **Step 5: Commit**

```bash
git add tests/mechanics/act-one.test.ts tests/e2e/act-one.spec.ts tests/e2e/thread.spec.ts
git commit -m "test: cover the Act I Beads end to end"
```

---

## Self-Review

**Spec coverage.** Act I's three Beads (Rain-Gauge Terrace → tokens/context; Aviary of Whispers → models/taxonomy; Cartwright's Yard → agents/harnesses) each get content, a bespoke mechanic, an achievement, a dialogue, and tests. The thread stays complete. Act II and III remain their own plans.

**Step scan.** Each step names one action with a checkable result. Signatures are pinned; bodies are left to the implementer except where the algorithm is not derivable (`run()`'s four rules, the matching and conflict rules).

**Type consistency.** `mountMechanic` is defined once (Task 1) and used unchanged in Tasks 2–3. Each element's public test surface (`decide`, `drops`, `capacity`; `assign`, `solve`, `conflicts`, `birds`, `tasks`; `setSlot`, `run`, `slots`, `components`, `goal`) is named in its task's Interfaces block and used by that task's tests. Registry functions (`defineMechanic`, `registerMechanics`, `registeredMechanicElement`) are the Wave 0 signatures.

**Review Focus.** Malformed params (each mechanic's fallback test), keyboard and fallback completion (each mechanic's tests), unreachable world (Step 7/5 content check in each task), authored-scenario solvability (each task proves it against `getContent().mechanics[id].params`, not a fixture), and constraint violations (Task 1's full-cup test, Task 2's conflict test).

**Proportion.** Three mechanics and their content; the plan pins the interfaces and the one non-obvious algorithm (`run()`), and leaves the rendering to the implementer.