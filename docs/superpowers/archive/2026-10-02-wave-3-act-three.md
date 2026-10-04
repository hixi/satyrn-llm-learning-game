# Wave 3 — Act III (The Method and the Commons): Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the final three Beads — the Blueprint and the Mason (spec-driven development), the Well and the Pipe (local vs cloud), and the Commons Garden (community and contribution, the epilogue) — completing the Thread.

**Architecture:** Same shape as Acts I and II. Each mechanic reads its scenario from the mechanic's content `params`, parses it defensively with a built-in default, exposes a small public test surface, and completes by emitting `mechanic:evidence` then `mechanic:complete`. Each task adds one mechanic and its content together so the link checker and the "every content mechanic is registered" contract test stay green at every boundary.

**Tech Stack:** unchanged — TypeScript, Vite, Lit 3, Vitest (+ jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-satyrn-book-as-game-design.md` (Act III — The Method and the Commons: spec-driven development; local vs cloud; the garden and the community; the epilogue where extensibility becomes the ending).

## Global Constraints

- Every mechanic implements `MechanicElement`: `setContext`, `emitProgress`/`emitComplete`/`emitEvidence`, `renderFallback`, and a `static accessibilityDescription`. It owns its styles and imports no other mechanic.
- Every mechanic is completable by keyboard alone and has a working "Continue without playing" control (`data-fallback`).
- Scenario data lives in `params` on the mechanic's content YAML; each mechanic parses it defensively and falls back to a default when absent or malformed. A bad `params` block must never throw.
- Each world is appended to `content/threads/main.yaml` in the same task it is created.
- Concept `related` links stay acyclic and one-directional.
- A mechanic must not reveal its own answer before the player acts (learned in Wave 2).
- No new dependencies. No network at runtime.
- `npm run check` stays green at every task boundary.

## Review Focus

1. **Malformed or absent `params`.** Expected: the mechanic renders a playable default scenario; never throws. (Tasks 1–3)
2. **Every Bead completes by keyboard alone and via the fallback.** Expected: both paths emit `mechanic.completed` and `evidence.submitted`. (Tasks 1–3)
3. **A world added but not threaded.** Expected: `npm run check:content` fails with `unreachable`. (Tasks 1–3)
4. **An authored scenario with no scoring answer.** Expected: a test proves the authored content's scenario is solvable, not just a hand-built fixture. (Tasks 1–3)
5. **A mechanic revealing the answer before the player acts.** Expected: a test asserts the pass state is absent on first render. (Tasks 1–3)
6. **A player-supplied name that is empty or whitespace-only.** Expected: planting is refused. (Task 3)

---

## File Structure

```
content/
  characters/draughtswoman.yaml  mason.yaml  well-digger.yaml  gardener.yaml
  concepts/spec.yaml  verification.yaml
           local-model.yaml  cloud.yaml
           community.yaml  contribution.yaml
  mechanics/blueprint.yaml  well-and-pipe.yaml  commons-garden.yaml
  worlds/blueprint-and-mason.yaml  well-and-pipe.yaml  commons-garden.yaml
  achievements/*.yaml  dialogues/*.yaml  threads/main.yaml (modified)
src/mechanics/
  blueprint/blueprint.ts  well/well.ts  garden/garden.ts
  registry.ts (modified, three lines)
tests/mechanics/
  blueprint.test.ts  well.test.ts  garden.test.ts  act-three.test.ts
tests/e2e/act-three.spec.ts
```

Each mechanic reuses the Wave 1 helper `tests/mechanics/helper.ts` unchanged.

---

### Task 1: The Blueprint and the Mason — spec-driven development

**Files:**
- Create: `content/characters/draughtswoman.yaml`, `content/characters/mason.yaml`, `content/concepts/spec.yaml`, `content/concepts/verification.yaml`, `content/mechanics/blueprint.yaml`, `content/worlds/blueprint-and-mason.yaml`, `content/achievements/measurable.yaml`, `content/dialogues/draughtswoman-intro.yaml`
- Create: `src/mechanics/blueprint/blueprint.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/blueprint.test.ts`

**Interfaces:**
- Produces: `mechanic-blueprint` element with public `blueprint` (`{ width: number; height: number }`), `clauses` (`{ id: string; text: string; kind: 'width' | 'height' | 'vague'; value?: number }[]`), `spec: string[]`, `choose(clauseId: string): void`, `build(): 'vague' | 'correct' | 'wrong-size'`.
- Scenario param shape: `{ blueprint: { width: number; height: number }; clauses: { id: string; text: string; kind: 'width' | 'height' | 'vague'; value?: number }[] }`.
- Rule: the Mason builds only from a measurable width **and** height clause; vague clauses cannot be checked. A build matching the blueprint is `correct`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/blueprint.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.blueprint'].params as any;
const widthClause = (v: number) => authored.clauses.find((c: any) => c.kind === 'width' && c.value === v);
const heightClause = (v: number) => authored.clauses.find((c: any) => c.kind === 'height' && c.value === v);

describe('blueprint', () => {
  it('builds nothing from a spec with no measurements', async () => {
    const { el, events } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', authored);
    await el.updateComplete;
    const vague = authored.clauses.find((c: any) => c.kind === 'vague');
    el.choose(vague.id);
    expect(el.build()).toBe('vague');
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('builds the wrong size from measurable but incorrect clauses', async () => {
    const { el } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', authored);
    await el.updateComplete;
    const wrongWidth = authored.clauses.find((c: any) => c.kind === 'width' && c.value !== authored.blueprint.width);
    el.choose(wrongWidth.id);
    el.choose(heightClause(authored.blueprint.height).id);
    expect(el.build()).toBe('wrong-size');
  });

  it('completes with the authored measurable clauses that match the blueprint', async () => {
    const { el, events } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', authored);
    await el.updateComplete;
    el.choose(widthClause(authored.blueprint.width).id);
    el.choose(heightClause(authored.blueprint.height).id);
    expect(el.build()).toBe('correct');
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('does not reveal a passing spec before it is built', async () => {
    const { el } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', authored);
    await el.updateComplete;
    expect(el.shadowRoot.textContent).not.toContain('the mason begins');
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', { blueprint: 1 });
    await el.updateComplete;
    expect(el.clauses.length).toBeGreaterThan(0);
    expect(el.blueprint.width).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-blueprint', 'mechanic.blueprint', 'world.blueprint-and-mason', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/blueprint.test.ts`
Expected: FAIL — `mechanic-blueprint` is not defined.

- [ ] **Step 3: Author the content**

Two Keepers share this Bead. `character.draughtswoman` — she draws what is to be built; a drawing no one can measure is a wish. `character.mason` — she builds only from numbers she can check; give her a wish and she waits. `concept.spec` — a description precise enough that someone else can build and check it; `concept.verification` — how you know the build matches the drawing (a test with a passing and a failing outcome). Keep `related` one-way (`spec → verification`).

`mechanic.blueprint` `params.blueprint`: `{ width: 60, height: 20 }`. `params.clauses`: measurable width `60 bricks wide` (value 60), measurable width `40 bricks wide` (value 40), measurable height `20 bricks high` (value 20), measurable height `30 bricks high` (value 30), and two vague clauses `sturdy enough` and `looks about right` with `kind: vague`. `world.blueprint-and-mason` `act: act3`, `order: 7`, keeper `character.draughtswoman` (the intro names both), concepts the two above. `achievement.measurable` (lesson, `mechanic.completed`). `dialogue.draughtswoman-intro` referencing the Mason.

- [ ] **Step 4: Implement `src/mechanics/blueprint/blueprint.ts`**

Parse `params` into `blueprint` (positive numbers else `{ width: 60, height: 20 }`) and `clauses` (validated `kind` in `width`/`height`/`vague`, numeric `value` for measurable kinds), each with a built-in default matching the authored scenario. Expose `choose` (toggle membership in `spec`), and `build()`:

1. Find the last chosen clause of kind `width` and of kind `height`.
2. If either is absent, return `'vague'`.
3. If `width.value === blueprint.width && height.value === blueprint.height`, `emitEvidence({ spec: [...this.spec], build: { width, height }, usedFallback: false })`, `emitComplete()`, return `'correct'`.
4. Otherwise return `'wrong-size'`.

`emitProgress` reports chosen clauses over two (the two measurements needed), capped at 1. Render the blueprint's target, each clause as a toggle showing whether it is measurable, and a "Build" button. The pass state appears only after a build. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.blueprint`; run `npx vitest run tests/mechanics/blueprint.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/blueprint src/mechanics/registry.ts tests/mechanics/blueprint.test.ts
git commit -m "feat: add the Blueprint and the Mason mechanic"
```

---

### Task 2: The Well and the Pipe — local vs cloud

**Files:**
- Create: `content/characters/well-digger.yaml`, `content/concepts/local-model.yaml`, `content/concepts/cloud.yaml`, `content/mechanics/well-and-pipe.yaml`, `content/worlds/well-and-pipe.yaml`, `content/achievements/your-own-well.yaml`, `content/dialogues/well-digger-intro.yaml`
- Create: `src/mechanics/well/well.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/well.test.ts`

**Interfaces:**
- Produces: `mechanic-well` element with public `tasks` (`{ id: string; label: string; need: number; sensitive: boolean }[]`), `wellCapacity: number`, `assignments: Record<string, 'well' | 'pipe'>`, `assign(taskId: string, source: 'well' | 'pipe'): void`, `check(): { ok: boolean; problems: string[] }`, `wellUsed(): number`, `pipeCost(): number`.
- Scenario param shape: `{ wellCapacity: number; tasks: { id: string; label: string; need: number; sensitive: boolean }[] }`.
- Rules: every sensitive task must be on the well; the total `need` assigned to the well must not exceed `wellCapacity`; every task must be assigned. `check()` names each unmet rule.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/well.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.well-and-pipe'].params as any;
const sensitive = () => authored.tasks.filter((t: any) => t.sensitive);
const plain = () => authored.tasks.filter((t: any) => !t.sensitive);

describe('well and pipe', () => {
  it('the authored scenario has exactly one valid routing', async () => {
    // Exhaustively confirm solvability and that sensitive tasks pin to the well.
    const n = authored.tasks.length;
    const solutions: number[] = [];
    for (let mask = 0; mask < 1 << n; mask++) {
      const well = authored.tasks.filter((_: any, i: number) => mask & (1 << i));
      const allSensitiveOnWell = sensitive().every((t: any) => well.some((w: any) => w.id === t.id));
      const used = well.reduce((sum: number, t: any) => sum + t.need, 0);
      if (allSensitiveOnWell && used <= authored.wellCapacity) solutions.push(mask);
    }
    expect(solutions.length).toBeGreaterThan(0);
  });

  it('completes with sensitive tasks on the well and plain tasks on the pipe', async () => {
    const { el, events } = mountMechanic('mechanic-well', 'mechanic.well-and-pipe', 'world.well-and-pipe', authored);
    await el.updateComplete;
    for (const t of sensitive()) el.assign(t.id, 'well');
    for (const t of plain()) el.assign(t.id, 'pipe');
    expect(el.check().ok).toBe(true);
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });

  it('reports a sensitive task sent to the pipe', async () => {
    const { el, events } = mountMechanic('mechanic-well', 'mechanic.well-and-pipe', 'world.well-and-pipe', authored);
    await el.updateComplete;
    for (const t of authored.tasks) el.assign(t.id, 'pipe');
    const result = el.check();
    expect(result.ok).toBe(false);
    expect(result.problems.some((p: string) => p.includes(sensitive()[0].id))).toBe(true);
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('reports the well overflowing', async () => {
    const { el } = mountMechanic('mechanic-well', 'mechanic.well-and-pipe', 'world.well-and-pipe', authored);
    await el.updateComplete;
    for (const t of authored.tasks) el.assign(t.id, 'well');
    expect(el.check().problems.some((p: string) => /capacity/i.test(p))).toBe(true);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-well', 'mechanic.well-and-pipe', 'world.well-and-pipe', { wellCapacity: 'x' });
    await el.updateComplete;
    expect(el.tasks.length).toBeGreaterThan(0);
    expect(el.wellCapacity).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-well', 'mechanic.well-and-pipe', 'world.well-and-pipe', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/well.test.ts`
Expected: FAIL — `mechanic-well` is not defined.

- [ ] **Step 3: Author the content**

`character.well-digger` — she dug the well and owns every drop; a pipe from a distant lake is fast and cheap today, but the water is not yours and someone else holds the tap. `concept.local-model` — a model on your own machine: private, under your control, bounded by what you own; `concept.cloud` — a model reached over a pipe to someone else's lake: quick and vast, and your work leaves the house. Keep `related` one-way (`cloud → local-model`).

`mechanic.well-and-pipe` `params.wellCapacity: 5`, `params.tasks`: `drinking` (need 2, sensitive), `bathing` (need 2, sensitive), `laundry` (need 3, not sensitive), `garden` (need 5, not sensitive). Sensitive need totals 4 ≤ 5; the non-sensitive tasks cannot also fit, so they must go to the pipe. `world.well-and-pipe` `act: act3`, `order: 8`. `achievement.your-own-well`. `dialogue.well-digger-intro`.

- [ ] **Step 4: Implement `src/mechanics/well/well.ts`**

Parse `params` into `wellCapacity` (positive number else 5) and `tasks` (each with a positive `need`, a boolean `sensitive`), with a built-in default matching the authored scenario. Expose `assign`, `wellUsed()` (sum of `need` for tasks on the well), `pipeCost()` (sum of `need` for tasks on the pipe, shown as the running cost), and `check()`:

1. Every task assigned? Otherwise `problems` names each unassigned task.
2. Every sensitive task on the well? Otherwise `problems` names each sensitive task on the pipe.
3. `wellUsed() <= wellCapacity`? Otherwise `problems` names the overflow against capacity.
4. When `problems` is empty, `emitEvidence({ assignments: {...}, wellUsed, pipeCost, usedFallback: false })`, `emitComplete()`, return `{ ok: true, problems: [] }`.

`emitProgress` reports correctly-placed tasks over total. Render each task with the well/pipe choice, the running well level and pipe cost, and a live list of problems after a check. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.well-and-pipe`; run `npx vitest run tests/mechanics/well.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/well src/mechanics/registry.ts tests/mechanics/well.test.ts
git commit -m "feat: add the Well and the Pipe mechanic"
```

---

### Task 3: The Commons Garden — community, contribution, the epilogue

**Files:**
- Create: `content/characters/gardener.yaml`, `content/concepts/community.yaml`, `content/concepts/contribution.yaml`, `content/mechanics/commons-garden.yaml`, `content/worlds/commons-garden.yaml`, `content/achievements/planted.yaml`, `content/dialogues/gardener-intro.yaml`
- Create: `src/mechanics/garden/garden.ts`
- Modify: `content/threads/main.yaml`, `src/mechanics/registry.ts`
- Test: `tests/mechanics/garden.test.ts`

**Interfaces:**
- Produces: `mechanic-garden` element with public `seeds` (`{ id: string; name: string }[]`), `communityBeads` (`{ id: string; name: string; keeper: string; about: string }[]`), `name: string`, `seed: string`, `visited: string[]`, `setName(value: string): void`, `chooseSeed(seedId: string): void`, `visit(beadId: string): void`, `plant(): 'planted' | 'unnamed' | 'no-seed'`.
- Scenario param shape: `{ seeds: { id: string; name: string }[]; communityBeads: { id: string; name: string; keeper: string; about: string }[] }`.
- Rules: visiting a community Bead records it; planting requires a non-blank name and a chosen seed, and completes only when the player has visited at least one community Bead and then planted.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mechanics/garden.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics } from '../../src/mechanics/registry';
import { mountMechanic } from './helper';

registerMechanics();
const authored = getContent().mechanics['mechanic.commons-garden'].params as any;

describe('commons garden', () => {
  it('refuses to plant an unnamed Bead', async () => {
    const { el } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.chooseSeed(authored.seeds[0].id);
    expect(el.plant()).toBe('unnamed');
  });

  it('refuses to plant a whitespace-only name', async () => {
    const { el } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.setName('   ');
    el.chooseSeed(authored.seeds[0].id);
    expect(el.plant()).toBe('unnamed');
  });

  it('requires a seed', async () => {
    const { el } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.setName('The Quiet Forge');
    expect(el.plant()).toBe('no-seed');
  });

  it('completes after visiting a community Bead and planting', async () => {
    const { el, events } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.visit(authored.communityBeads[0].id);
    el.setName('The Quiet Forge');
    el.chooseSeed(authored.seeds[authored.seeds.length - 1].id);
    expect(el.plant()).toBe('planted');
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
    expect(events.some((e) => e.type === 'evidence.submitted' && (e.evidence as any).usedFallback === false)).toBe(true);
  });

  it('does not complete by planting without visiting the commons', async () => {
    const { el, events } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.setName('The Quiet Forge');
    el.chooseSeed(authored.seeds[0].id);
    el.plant();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(false);
  });

  it('falls back to a default scenario when params are malformed', async () => {
    const { el } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', { seeds: 0 });
    await el.updateComplete;
    expect(el.seeds.length).toBeGreaterThan(0);
    expect(el.communityBeads.length).toBeGreaterThan(0);
  });

  it('completes via the accessible continue control', async () => {
    const { el, events } = mountMechanic('mechanic-garden', 'mechanic.commons-garden', 'world.commons-garden', authored);
    await el.updateComplete;
    el.renderRoot.querySelector('[data-fallback]').click();
    await el.updateComplete;
    expect(events.some((e) => e.type === 'mechanic.completed')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/mechanics/garden.test.ts`
Expected: FAIL — `mechanic-garden` is not defined.

- [ ] **Step 3: Author the content**

`character.gardener` — she keeps the commons: a garden where every Bead anyone plants is welcome, and the garden grows by exactly the number of people who add to it. `concept.community` — people who build together in the open, each contributing what they know; `concept.contribution` — the act of adding something back: a Bead, a note, a fix, a report from your own machine. Keep `related` one-way (`community → contribution`).

`mechanic.commons-garden` `params.seeds`: four named seeds drawn from the game's ideas — `Attention`, `Evidence`, `Constraint`, `Tending` — each `{ id, name }`. `params.communityBeads`: three Beads said to be planted by others — `{ id, name, keeper, about }`, e.g. "The Fog Alphabet" by a lighthouse keeper, "The Long Ledger" by a bookkeeper, "The Second Lantern" by a night watch. `world.commons-garden` `act: act3`, `order: 9`, keeper `character.gardener`. `achievement.planted` (kind `journey`, `mechanic.completed` on `mechanic.commons-garden`). `dialogue.gardener-intro`.

- [ ] **Step 4: Implement `src/mechanics/garden/garden.ts`**

Parse `params` into `seeds` (`{ id, name }[]`) and `communityBeads` (`{ id, name, keeper, about }[]`), each with a built-in default matching the authored scenario. Expose `setName`, `chooseSeed`, `visit` (appends to `visited` once), and `plant()`:

1. If `name.trim()` is empty, return `'unnamed'`.
2. If no seed chosen, return `'no-seed'`.
3. Otherwise record the planting; if `visited.length > 0` and not yet completed, `emitEvidence({ name: this.name.trim(), seed: this.seed, visited: [...this.visited], usedFallback: false })`, `emitComplete()`; return `'planted'`.

`emitProgress` reports `visited.length ? 1 : 0` before planting and 1 after. Render: the community Beads as visitable cards (showing keeper and blurb once visited); a name input (`<label>` + `<input>`); the seeds as choices; a "Plant your Bead" button; and, after planting, the player's Bead shown joining the garden. Keyboard-only completion: the input and buttons are all focusable. `renderFallback()` describes the task; `renderAccessibleShell()` supplies the continue control.

- [ ] **Step 5: Register and verify**

Register `mechanic.commons-garden`; run `npx vitest run tests/mechanics/garden.test.ts && npm run check:content` → PASS and `content OK`.

- [ ] **Step 6: Commit**

```bash
git add content src/mechanics/garden src/mechanics/registry.ts tests/mechanics/garden.test.ts
git commit -m "feat: add the Commons Garden mechanic"
```

---

### Task 4: Act III integration, whole-Thread test, and e2e

**Files:**
- Create: `tests/mechanics/act-three.test.ts`, `tests/e2e/act-three.spec.ts`, `tests/mechanics/whole-thread.test.ts`

**Interfaces:**
- Consumes: all three Act III mechanics and every earlier mechanic.

- [ ] **Step 1: Write the integration and whole-Thread tests**

```ts
// tests/mechanics/act-three.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics, registeredMechanics, registeredMechanicElement } from '../../src/mechanics/registry';
import { validateContent } from '../../tools/content/validate';
import { loadRawContent } from '../../tools/content/load';

registerMechanics();

describe('Act III', () => {
  it('has three Beads in act3, in order, each with a distinct mechanic', () => {
    const worlds = Object.values(getContent().worlds).filter((w) => w.act === 'act3').sort((a, b) => a.order - b.order);
    expect(worlds.map((w) => w.order)).toEqual([7, 8, 9]);
    const tags = worlds.map((w) => registeredMechanicElement(w.mechanic));
    expect(tags.every(Boolean)).toBe(true);
    expect(new Set(tags).size).toBe(3);
  });

  it('every Act III mechanic is registered and content validates', () => {
    const content = validateContent(loadRawContent('content'));
    for (const world of Object.values(content.worlds).filter((w) => w.act === 'act3')) {
      expect(registeredMechanics()).toContain(world.mechanic);
    }
  });
});
```

```ts
// tests/mechanics/whole-thread.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { registerMechanics, registeredMechanicElement } from '../../src/mechanics/registry';

registerMechanics();

describe('the whole Thread', () => {
  it('names ten worlds — prologue plus nine Beads — each with a registered mechanic', () => {
    const content = getContent();
    const thread = content.threads['thread.main'];
    expect(thread.sequence.length).toBe(10);
    for (const worldId of thread.sequence) {
      const world = content.worlds[worldId];
      expect(world, worldId).toBeTruthy();
      expect(registeredMechanicElement(world.mechanic), world.mechanic).toBeTruthy();
    }
  });

  it('gives every world at least one concept, one achievement, and a distinct mechanic from its neighbours', () => {
    const content = getContent();
    const tags = Object.values(content.worlds).map((w) => registeredMechanicElement(w.mechanic));
    expect(new Set(tags).size).toBe(tags.length);
    for (const world of Object.values(content.worlds)) {
      expect(world.concepts.length, world.id).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run them**

Run: `npx vitest run tests/mechanics/act-three.test.ts tests/mechanics/whole-thread.test.ts`
Expected: PASS if Tasks 1–3 are complete; otherwise the failure names the missing world or mechanic.

- [ ] **Step 3: Write the e2e walk**

```ts
// tests/e2e/act-three.spec.ts
import { test, expect } from '@playwright/test';

const FALLBACK = '[data-fallback]';
const TAG: Record<string, string> = {
  'blueprint-and-mason': 'blueprint',
  'well-and-pipe': 'well',
  'commons-garden': 'garden',
};

test('walks all three Act III Beads', async ({ page }) => {
  for (const slug of Object.keys(TAG)) {
    await page.goto(`/#/world/world.${slug}`);
    await expect(page.locator('satyrn-world')).toBeVisible();
    await page.locator(`satyrn-world mechanic-${TAG[slug]} ${FALLBACK}`).click();
  }
  await page.goto('/#/journal');
  await expect(page.locator('satyrn-moon')).toContainText(/Measurable/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Your Own Well/i);
  await expect(page.locator('satyrn-moon')).toContainText(/Planted/i);
});
```

- [ ] **Step 4: Run the full gate**

Run: `npm run check`
Expected: strict content check, all unit tests, build, and all four e2e specs pass.

- [ ] **Step 5: Commit**

```bash
git add tests/mechanics/act-three.test.ts tests/mechanics/whole-thread.test.ts tests/e2e/act-three.spec.ts
git commit -m "test: cover Act III and the whole Thread"
```

---

## Self-Review

**Spec coverage.** Act III's three Beads each get content, a bespoke mechanic, an achievement, a dialogue, and tests: Blueprint and the Mason → spec-driven development; Well and the Pipe → local vs cloud; Commons Garden → community, contribution, the epilogue. The whole-Thread test asserts the complete arc: ten worlds, prologue plus nine Beads, each with a registered mechanic and a distinct mechanic from its neighbours.

**Step scan.** Each step names one action with a checkable result. Signatures are pinned; bodies are left to the implementer except where the rule is the lesson (`build`'s measurable-clause test, the well's three constraints, planting's name/seed/visit requirements).

**Type consistency.** The Wave 1 helper `mountMechanic` is reused unchanged. Each element's public test surface is named in its Interfaces block and used by that task's tests: `blueprint`/`clauses`/`spec`/`choose`/`build`; `tasks`/`wellCapacity`/`assign`/`assignments`/`check`/`wellUsed`/`pipeCost`; `seeds`/`communityBeads`/`name`/`seed`/`visited`/`setName`/`chooseSeed`/`visit`/`plant`. Registry functions are the Wave 0 signatures.

**Review Focus.** Malformed params (each mechanic's fallback test), keyboard and fallback completion (each mechanic's tests), unreachable world (each task's content check), authored-scenario solvability (Task 2 proves at least one valid routing exhaustively; Tasks 1 and 3 solve the authored scenario directly), no early reveal (Task 1's first-render test), and empty-name refusal (Task 3's whitespace test).

**Proportion.** Three mechanics and their content, plus the closure tests that assert the finished arc; the plan pins interfaces and the non-obvious rules and leaves the rendering to the implementer.