# Wave 2 — Act II (The Snags): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three Act II Beads — the Round Path (runaway loops), the Gate of Orders (instructions, constraints, ambiguity), and the Assayer's Scale (evaluation; vanity vs evidence) — each with a bespoke mechanic, content, achievements, and an e2e walk.

**Architecture:** Same shape as Act I. Each mechanic reads its scenario from the mechanic's content `params`, parses it defensively with a built-in default, exposes a small public test surface, and completes by emitting `mechanic:evidence` then `mechanic:complete`. Each task adds one mechanic and its content together so the link checker and the "every content mechanic is registered" contract test stay green at every boundary.

**Tech Stack:** unchanged — TypeScript, Vite, Lit 3, Vitest (+ jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-satyrn-book-as-game-design.md` (Act II — The Snags: runaway loops; instructions and constraints; evaluation and evidence over vanity).

## Global Constraints

- Every mechanic implements `MechanicElement`: `setContext`, `emitProgress`/`emitComplete`/`emitEvidence`, `renderFallback`, and a `static accessibilityDescription`. It owns its styles and imports no other mechanic.
- Every mechanic is completable by keyboard alone and has a working "Continue without playing" control (`data-fallback`).
- Scenario data lives in `params` on the mechanic's content YAML; each mechanic parses it defensively and falls back to a default when absent or malformed. A bad `params` block must never throw.
- Each world is appended to `content/threads/main.yaml` in the same task it is created.
- Concept `related` links stay acyclic and one-directional (the link checker enforces this).
- Achievements are data; conditions reference only existing events.
- No new dependencies. No network at runtime.
- `npm run check` stays green at every task boundary.

## Review Focus

1. **Malformed or absent `params`.** Expected: the mechanic renders a playable default scenario; never throws. (Tasks 1–3)
2. **Every Bead completes by keyboard alone and via the fallback.** Expected: both paths emit `mechanic.completed` and `evidence.submitted`. (Tasks 1–3)
3. **A world added but not threaded.** Expected: `npm run check:content` fails with `unreachable`. (Tasks 1–3)
4. **An authored scenario that is unsolvable or has no correct answer.** Expected: a test proves the authored content's scenario has a passing answer, not just that a hand-built fixture does. (Tasks 1–3)
5. **A plausible-but-wrong answer that the mechanic must reject.** Expected: the mechanic distinguishes it from the correct one. (Task 1: selecting a non-minimal or wrong block; Task 2: an order that passes the obvious cases and fails an edge case; Task 3: a check that cannot fail.)

---

## File Structure

```
content/
  characters/miller.yaml  gatekeeper.yaml  assayer.yaml
  concepts/runaway-loop.yaml  loop-breaker.yaml
           instruction.yaml  constraint.yaml
           evaluation.yaml  evidence.yaml
  mechanics/round-path.yaml  gate-of-orders.yaml  assayers-scale.yaml
  worlds/round-path.yaml  gate-of-orders.yaml  assayers-scale.yaml
  achievements/*.yaml  dialogues/*.yaml  threads/main.yaml (modified)
src/mechanics/
  round-path/round-path.ts  gate/gate.ts  assayer/assayer.ts
  registry.ts (modified, one line per mechanic)
tests/mechanics/
  round-path.test.ts  gate.test.ts  assayer.test.ts  act-two.test.ts
tests/e2e/act-two.spec.ts
```

Each mechanic reuses the Wave 1 helper `tests/mechanics/helper.ts` unchanged.

---

### Task 1: The Round Path — runaway loops

**Files:**
- Create: `content/characters/miller.yaml`, `content/concepts/runaway-loop.yaml`, `content/concepts/loop-breaker.yaml`, `content/mechanics/round-path.yaml`, `content/worlds/round-path.yaml`, `content/achievements/broken-circle.yaml`, `content/dialogues/miller-intro.yaml`
- Create: `src/mechanics/round-path/round-path.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/round-path.test.ts`

**Interfaces:**
- Produces: `mechanic-round-path` element with public `steps` (`{ id: string; label: string }[]`), `cycleStart: number`, `cycleLength: number`, `selection: string[]`, `select(id: string): void`, `breakLoop(): 'broken' | 'wrong-loop' | 'not-selected'`, `stopMule(): 'stopped'`.
- Scenario param shape: `{ steps: { id: string; label: string }[]; cycleStart: number; cycleLength: number }`.
- Rule: the repeating block is exactly the `cycleLength` step ids starting at index `cycleStart`. `breakLoop()` succeeds only when `selection` is exactly that set.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/round-path.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.round-path'].params as any;

describe('round path', () => {
  it('is solvable by selecting the authored repeating block', async () => {
    const { el, events } = mountMechanic('mechanic-round-path', 'mechanic.round-path', 'world.round-path', authored);
    await el.updateComplete;
    for (let i = authored.cycleStart; i < authored.cycleStart + authored.cycleLength; i++) {
      el.select(authored.steps[i].id);
    }
    expect(el.breakLoop()).toBe('broken');
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('rejects a block that is not the repeating one', async () => {
    const { el, events } = mountMechanic('mechanic-round-path', 'mechanic.round-path', 'world.round-path', authored);
    await el.updateComplete;
    el.select(authored.steps[0].id); // a useful step, before the loop begins
    expect(el.breakLoop()).toBe('wrong-loop');
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('reports not-selected when nothing is chosen', async () => {
    const { el } = mountMechanic('mechanic-round-path', 'mechanic.round-path', 'world.round-path', authored);
    await el.updateComplete;
    expect(el.breakLoop()).toBe('not-selected');
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-round-path', 'mechanic.round-path', 'world.round-path', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/round-path.test.ts`
Expected: FAIL — `mechanic-round-path` is not defined.

- [ ] **Step 3: Author the content**

`character.miller` — she tends the mill and has watched the mule walk the same circle all night; the work of the morning was done by the time the circle began. `concept.runaway-loop` — a model that repeats the same step without changing anything, spending its budget going nowhere; `concept.loop-breaker` — a guard that notices the repetition and changes the pattern without halting the useful work. Keep `related` one-way (`runaway-loop → loop-breaker`).

`mechanic.round-path` `params`: three useful steps (`fetch grain`, `grind flour`, `bag flour`), then a repeating block `pat the post` / `find nothing new` repeated four times. So `cycleStart: 3`, `cycleLength: 2`, eight steps total. `a11y` describes selecting the first full turn of the circle then breaking it.

`world.round-path`: `act: act2`, `order: 4`, keeper `character.miller`, concepts the two above, mechanic `mechanic.round-path`. Append to the thread. `achievement.broken-circle` (lesson, `mechanic.completed` on `mechanic.round-path`). `dialogue.miller.intro` with one gated choice.

- [ ] **Step 4: Implement `src/mechanics/round-path/round-path.ts`**

Parse `params` into `steps` (`{ id, label }[]`) and `cycleStart`/`cycleLength` (non-negative integers within bounds) with a built-in default matching the authored scenario. Expose `select` toggling a step id in `selection`, `stopMule()` returning `'stopped'` (a deliberate wrong turn — stop everything and lose the morning's work), and `breakLoop()`:

1. If `selection` is empty return `'not-selected'`.
2. If `selection` is exactly the ids at indices `[cycleStart, cycleStart + cycleLength)` (as a set), `emitEvidence({ cycleStart, cycleLength, brokeAt: cycleStart, usedFallback: false })`, `emitComplete()`, return `'broken'`.
3. Otherwise return `'wrong-loop'`.

`emitProgress` reports `selection.length / cycleLength` capped at 1. Render the numbered steps, marking selection; render the three useful steps as "this morning's work" so the lesson is visible; provide "Break the loop" and "Stop the mule" buttons. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.round-path`; run `npx vitest run tests/mechanics/round-path.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/round-path src/mechanics/registry.ts tests/mechanics/round-path.test.ts
git commit -m "feat: add the Round Path mechanic"
```

---

### Task 2: The Gate of Orders — instructions, constraints, ambiguity

**Files:**
- Create: `content/characters/gatekeeper.yaml`, `content/concepts/instruction.yaml`, `content/concepts/constraint.yaml`, `content/mechanics/gate-of-orders.yaml`, `content/worlds/gate-of-orders.yaml`, `content/achievements/standing-order.yaml`, `content/dialogues/gatekeeper-intro.yaml`
- Create: `src/mechanics/gate/gate.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/gate.test.ts`

**Interfaces:**
- Produces: `mechanic-gate` element with public `orders` (`{ id: string; text: string }[]`), `travellers` (`{ id: string; label: string }[]`), `selectedOrder: string`, `chooseOrder(orderId: string): { passed: boolean; failures: string[] }`, `readings(): { orderId: string; failures: string[] }[]`.
- Scenario param shape: `{ travellers: { id: string; label: string; attributes: string[]; shouldEnter: boolean }[]; orders: { id: string; text: string; allow: string[]; deny: string[] }[] }`.
- Rule: the gate is perfectly literal. An order admits a traveller iff the traveller has **all** of the order's `allow` attributes and **none** of its `deny` attributes. An order passes iff, for every traveller, `admitted === traveller.shouldEnter`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/gate.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.gate-of-orders'].params as any;
const passingOrder = () => authored.orders.find((o: any) => {
  const admits = (t: any) => o.allow.every((a: string) => t.attributes.includes(a)) && o.deny.every((d: string) => !t.attributes.includes(d));
  return authored.travellers.every((t: any) => admits(t) === t.shouldEnter);
});

describe('gate of orders', () => {
  it('the authored scenario has exactly one order that passes every case', async () => {
    const passing = authored.orders.filter((o: any) => {
      const admits = (t: any) => o.allow.every((a: string) => t.attributes.includes(a)) && o.deny.every((d: string) => !t.attributes.includes(d));
      return authored.travellers.every((t: any) => admits(t) === t.shouldEnter);
    });
    expect(passing.length).toBe(1);
  });

  it('completes when the passing order is chosen', async () => {
    const { el, events } = mountMechanic('mechanic-gate', 'mechanic.gate-of-orders', 'world.gate-of-orders', authored);
    await el.updateComplete;
    const result = el.chooseOrder(passingOrder().id);
    expect(result.passed).toBe(true);
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });

  it('rejects an order that fails an edge case and names it', async () => {
    const { el, events } = mountMechanic('mechanic-gate', 'mechanic.gate-of-orders', 'world.gate-of-orders', authored);
    await el.updateComplete;
    const failing = authored.orders.find((o: any) => o.id !== passingOrder().id);
    const result = el.chooseOrder(failing.id);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-gate', 'mechanic.gate-of-orders', 'world.gate-of-orders', { travellers: 5 });
    await el.updateComplete;
    expect(el.orders.length).toBeGreaterThan(0);
    expect(el.travellers.length).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-gate', 'mechanic.gate-of-orders', 'world.gate-of-orders', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/gate.test.ts`
Expected: FAIL — `mechanic-gate` is not defined.

- [ ] **Step 3: Author the content**

Design a scenario with exactly one passing order and orders that fail on edge cases. Use a lantern motif consistent with the prologue. Travellers and their attributes, each with `shouldEnter`:

- `merchant-lantern`: attributes `[merchant, lantern]`, shouldEnter `true`
- `merchant-dark`: attributes `[merchant]`, shouldEnter `false`
- `pilgrim-lantern`: attributes `[pilgrim, lantern]`, shouldEnter `true`
- `pilgrim-dark`: attributes `[pilgrim]`, shouldEnter `false`

Orders (the gate is literal: admit iff has all `allow` and none of `deny`):

- `any-lantern`: text "Admit anyone carrying a lantern", `allow: [lantern]`, `deny: []` → passes all four. **This is the passing order.**
- `merchants-only`: text "Admit merchants; turn away pilgrims", `allow: [merchant]`, `deny: []` → admits `merchant-dark` (should be turned away) and turns away the pilgrim with a lantern. Fails.
- `everyone`: text "Admit everyone, and turn away no one", `allow: []`, `deny: []` → everybody admitted; fails.
- `no-one-dark`: text "Turn away anyone without a lantern", `allow: [lantern]`, `deny: []` — wait, that duplicates `any-lantern`; use instead `carrying-nothing`: text "Admit only those who carry nothing", `allow: []`, `deny: [lantern]` → turns away everyone with a lantern; fails.

Confirm by the Step 1 test that exactly one order passes. `concept.instruction` (a standing order a literal reader follows exactly), `concept.constraint` (a condition that narrows what is allowed; ambiguity is a constraint the reader must guess). `world.gate-of-orders` `act: act2`, `order: 5`. `achievement.standing-order`. `dialogue.gatekeeper.intro`.

- [ ] **Step 4: Implement `src/mechanics/gate/gate.ts`**

Parse `params` into `travellers` (`{ id, label, attributes: string[], shouldEnter: boolean }[]`) and `orders` (`{ id, text, allow: string[], deny: string[] }[]`), each with a built-in default matching the authored scenario. Expose `chooseOrder(orderId)`:

1. Evaluate every traveller: `admitted = order.allow.every(a => attributes.includes(a)) && order.deny.every(d => !attributes.includes(d))`.
2. `failures` = traveller ids where `admitted !== shouldEnter`.
3. Set `selectedOrder = orderId`; if `failures` is empty, `emitEvidence({ orderId, failures: [], usedFallback: false })` then `emitComplete()`.
4. Return `{ passed: failures.length === 0, failures }`.

`readings()` returns each order's `{ orderId, failures }` for display (the gate can try them all). `emitProgress` reports the best order's correct-traveller count over the traveller count. Render each order as a radio choice with its text and a live pass/fail line naming failures by traveller label. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.gate-of-orders`; run `npx vitest run tests/mechanics/gate.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/gate src/mechanics/registry.ts tests/mechanics/gate.test.ts
git commit -m "feat: add the Gate of Orders mechanic"
```

---

### Task 3: The Assayer's Scale — evaluation; vanity vs evidence

**Files:**
- Create: `content/characters/assayer.yaml`, `content/concepts/evaluation.yaml`, `content/concepts/evidence.yaml`, `content/mechanics/assayers-scale.yaml`, `content/worlds/assayers-scale.yaml`, `content/achievements/can-fail.yaml`, `content/dialogues/assayer-intro.yaml`
- Create: `src/mechanics/assayer/assayer.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/assayer.test.ts`

**Interfaces:**
- Produces: `mechanic-assayers-scale` element with public `items` (`{ id: string; label: string }[]`), `checks` (`{ id: string; label: string; kind: 'vanity' | 'honest' | 'broken' }[]`), `readings(checkId: string): Record<string, 'sound' | 'unsound'>`, `relyOn(checkId: string): 'can-fail' | 'cannot-fail' | 'always-fails'`, `markUnsound(itemId: string): void`, `reliedCheck: string`, `marked: string[]`.
- Scenario param shape: `{ items: { id: string; label: string; sound: boolean }[]; checks: { id: string; label: string; kind: 'vanity' | 'honest' | 'broken' }[] }`.
- Rule: a `vanity` check reads `sound` for everything; an `honest` check reads each item's true state; a `broken` check reads `unsound` for everything. Completion requires `reliedCheck` to be an `honest` check and `marked` to be exactly the unsound item ids.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/assayer.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.assayers-scale'].params as any;
const honest = () => authored.checks.find((c: any) => c.kind === 'honest');
const unsoundIds = () => authored.items.filter((i: any) => !i.sound).map((i: any) => i.id);

describe('assayer scale', () => {
  it('the vanity check cannot fail and is refused', async () => {
    const { el, events } = mountMechanic('mechanic-assayers-scale', 'mechanic.assayers-scale', 'world.assayers-scale', authored);
    await el.updateComplete;
    const vanity = authored.checks.find((c: any) => c.kind === 'vanity');
    const readings = el.readings(vanity.id);
    expect(Object.values(readings).every((r) => r === 'sound')).toBe(true);
    expect(el.relyOn(vanity.id)).toBe('cannot-fail');
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('the honest check reveals the unsound item', async () => {
    const { el } = mountMechanic('mechanic-assayers-scale', 'mechanic.assayers-scale', 'world.assayers-scale', authored);
    await el.updateComplete;
    const readings = el.readings(honest().id);
    for (const id of unsoundIds()) expect(readings[id]).toBe('unsound');
    expect(el.relyOn(honest().id)).toBe('can-fail');
  });

  it('completes only when an honest check is relied on and the unsound item is marked', async () => {
    const { el, events } = mountMechanic('mechanic-assayers-scale', 'mechanic.assayers-scale', 'world.assayers-scale', authored);
    await el.updateComplete;
    el.relyOn(honest().id);
    for (const id of unsoundIds()) el.markUnsound(id);
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-assayers-scale', 'mechanic.assayers-scale', 'world.assayers-scale', { checks: 1 });
    await el.updateComplete;
    expect(el.items.length).toBeGreaterThan(0);
    expect(el.checks.length).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-assayers-scale', 'mechanic.assayers-scale', 'world.assayers-scale', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/assayer.test.ts`
Expected: FAIL — `mechanic-assayers-scale` is not defined.

- [ ] **Step 3: Author the content**

`character.assayer` — she weighs what the mill produced; her gleaming scale says everything is excellent, and she has begun to distrust it. `concept.evaluation` (judging whether something works — the reading is only as good as the check behind it), `concept.evidence` (a check that could have failed and did not is what makes a claim trustworthy; "verify, don't assert"). Keep `related` one-way (`evaluation → evidence`).

`mechanic.assayers-scale` `params.items`: four weights, `[sound, sound, unsound, sound]` with labels (`the miller's measure`, `the baker's measure`, `the cracked weight`, `the ferryman's measure`). `params.checks`: `vanity` ("the gleaming scale — always reads excellent"), `honest` ("the assay — weighs against a known good"), `broken` ("the stubborn scale — rejects everything"). `world.assayers-scale` `act: act2`, `order: 6`. `achievement.can-fail` (kind `lesson`, `mechanic.completed`). `dialogue.assayer.intro`.

- [ ] **Step 4: Implement `src/mechanics/assayer/assayer.ts`**

Parse `params` into `items` (`{ id, label, sound }[]`) and `checks` (`{ id, label, kind }[]`) with a built-in default matching the authored scenario; validate `kind` against the three literals (unknown kinds become `vanity`). Expose:

- `readings(checkId)`: `vanity` → all `'sound'`; `honest` → each item's `sound ? 'sound' : 'unsound'`; `broken` → all `'unsound'`.
- `relyOn(checkId)`: set `reliedCheck`; return `'cannot-fail'` for a vanity check, `'always-fails'` for a broken check, `'can-fail'` for an honest one; then `check()`.
- `markUnsound(itemId)`: toggle the item in `marked`; then `check()`.
- `check()`: complete (with evidence `{ reliedCheck, marked, usedFallback: false }`) only when the relied check is `honest` and `marked` as a set equals the unsound item ids.

`emitProgress` reports marked-unsound proportion. Render: each item with a "mark unsound" toggle and the current reading from the relied check; each check as a button to rely on, with a note that a scale which cannot fail proves nothing. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.assayers-scale`; run `npx vitest run tests/mechanics/assayer.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/assayer src/mechanics/registry.ts tests/mechanics/assayer.test.ts
git commit -m "feat: add the Assayer's Scale mechanic"
```

---

### Task 4: Act II integration test and e2e walk

**Files:**
- Create: `tests/mechanics/act-two.test.ts`, `tests/e2e/act-two.spec.ts`

**Interfaces:**
- Consumes: all three Act II mechanics and the Wave 0 components.

- [ ] **Step 1: Write the integration test**

```ts
// tests/mechanics/act-two.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics, registeredMechanics, registeredMechanicElement } from '../../src/mechanics/registry';
import { validateContent } from '../../tools/content/validate';
import { loadRawContent } from '../../tools/content/load';

registerMechanics();

describe('Act II', () => {
  it('has three Beads in act2, in order, each with a distinct mechanic', () => {
    const worlds = Object.values(getContent().worlds)
      .filter((w) => w.act === 'act2')
      .sort((a, b) => a.order - b.order);
    expect(worlds.map((w) => w.order)).toEqual([4, 5, 6]);
    const tags = worlds.map((w) => registeredMechanicElement(w.mechanic));
    expect(tags.every(Boolean)).toBe(true);
    expect(new Set(tags).size).toBe(3);
  });

  it('every Act II mechanic is registered and content validates', () => {
    const content = validateContent(loadRawContent('content'));
    for (const world of Object.values(content.worlds).filter((w) => w.act === 'act2')) {
      expect(registeredMechanics()).toContain(world.mechanic);
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx vitest run tests/mechanics/act-two.test.ts`
Expected: PASS if Tasks 1–3 are complete; otherwise the failure names the missing world or mechanic.

- [ ] **Step 3: Write the e2e walk**

```ts
// tests/e2e/act-two.spec.ts
import { test, expect } from '@playwright/test';

const FALLBACK = '[data-fallback]';
const TAG: Record<string, string> = {
  'round-path': 'round-path',
  'gate-of-orders': 'gate',
  'assayers-scale': 'assayers-scale',
};

test('walks all three Act II Beads', async ({ page }) => {
  for (const slug of Object.keys(TAG)) {
    await page.goto(`/#/world/world.${slug}`);
    await expect(page.locator('satyrn-world')).toBeVisible();
    await page.locator(`satyrn-world mechanic-${TAG[slug]} ${FALLBACK}`).click();
  }
  await page.goto('/#/journal');
  await expect(page.locator('satyrn-moon')).toContainText(/Broken Circle/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Standing Order/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Can Fail/i);
});
```

- [ ] **Step 4: Run the full gate**

Run: `npm run check`
Expected: strict content check, all unit tests, build, and all three e2e specs pass.

- [ ] **Step 5: Commit**

```bash
git add tests/mechanics/act-two.test.ts tests/e2e/act-two.spec.ts
git commit -m "test: cover the Act II Beads end to end"
```

---

## Self-Review

**Spec coverage.** Act II's three Beads each get content, a bespoke mechanic, an achievement, a dialogue, and tests: Round Path → runaway loops; Gate of Orders → instructions, constraints, ambiguity; Assayer's Scale → evaluation, evidence over vanity. The thread stays complete. Act III remains its own plan.

**Step scan.** Each step names one action with a checkable result. Signatures are pinned; bodies are left to the implementer except where the rule is the lesson (`breakLoop`'s exact-block test, the gate's literal admit rule, the three checks' readings).

**Type consistency.** The Wave 1 helper `mountMechanic` is reused unchanged. Each element's public test surface is named in its Interfaces block and used by that task's tests: `select`/`breakLoop`/`stopMule`/`steps`/`cycleStart`/`cycleLength`/`selection`; `chooseOrder`/`readings`/`orders`/`travellers`/`selectedOrder`; `readings`/`relyOn`/`markUnsound`/`items`/`checks`/`reliedCheck`/`marked`. Registry functions are the Wave 0 signatures.

**Review Focus.** Malformed params (each mechanic's fallback test), keyboard and fallback completion (each mechanic's tests), unreachable world (each task's content check), authored-scenario solvability (Task 2 proves exactly one passing order; Tasks 1 and 3 solve the authored scenario directly), and plausible-but-wrong answers (Task 1's wrong block, Task 2's failing order with named failures, Task 3's vanity check refused).

**Proportion.** Three mechanics and their content; the plan pins interfaces, the authored scenarios, and the three non-obvious rules, and leaves the rendering to the implementer.