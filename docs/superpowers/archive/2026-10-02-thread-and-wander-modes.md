# Thread and Wander Modes: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Thread/Wander toggle do what the spec says: Thread mode guides the journey along `thread.main.sequence` with the Moon narrating and a next-Bead path; Wander mode presents every Bead freely, grouped by act.

**Architecture:** One pure helper (`src/thread.ts`) computes sequence order, the next unvisited Bead, and the neighbour in sequence. `satyrn-map` and `satyrn-world` take a `mode` property; `satyrn-app` derives it from stored state (and the `#/thread` route selects thread mode). No new persisted state — thread position is derived from `visitedWorlds`.

**Tech Stack:** unchanged.

**Spec:** `docs/superpowers/specs/2026-10-02-satyrn-book-as-game-design.md` (§Modes: Thread is guided, the Moon narrates the recommended order; Wander drops into any Bead; nothing is locked).

## Global Constraints

- Nothing is ever locked: both modes list and link every Bead (Thread orders them, Wander groups them).
- The mode lives in the store (`mode`); `#/thread` selects thread mode so the toggle and the view agree.
- No new persisted state; thread position is derived from `visitedWorlds`.
- Every new user-visible string has a sensible fallback, and new copy goes in `content/strings/ui.yaml`.
- `npm run check` stays green.

## Review Focus

1. **A Bead missing from the thread sequence.** Expected: it still appears in Wander mode; the build's unreachable check is the guard.
2. **The last Bead in Thread mode.** Expected: "You have walked the whole Thread", with no dangling next link.
3. **Everything already visited.** Expected: no next CTA; the completion line shows.
4. **Switching mode mid-journey.** Expected: the view changes immediately, the store mode is consistent, and nothing is lost.
5. **Direct navigation to a Bead.** Expected: it renders and works in whichever mode is stored, thread footer included.

---

### Task 1: The thread helper

**Files:**
- Create: `src/thread.ts`
- Test: `tests/thread.test.ts`

**Interfaces:**
- Produces: `threadSequence(content: Content): string[]`; `nextUnvisited(sequence: string[], visited: string[]): string | undefined`; `neighbourInSequence(sequence: string[], worldId: string): string | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/thread.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../src/content';
import { threadSequence, nextUnvisited, neighbourInSequence } from '../src/thread';

describe('thread helper', () => {
  it('reads the authored sequence', () => {
    const seq = threadSequence(getContent());
    expect(seq[0]).toBe('world.lantern-room');
    expect(seq.length).toBe(10);
  });
  it('finds the next unvisited Bead', () => {
    const seq = ['a', 'b', 'c'];
    expect(nextUnvisited(seq, [])).toBe('a');
    expect(nextUnvisited(seq, ['a', 'b'])).toBe('c');
    expect(nextUnvisited(seq, ['a'])).toBe('b');
  });
  it('has no next when the Thread is walked', () => {
    expect(nextUnvisited(['a', 'b'], ['a', 'b'])).toBeUndefined();
    expect(nextUnvisited([], [])).toBeUndefined();
  });
  it('finds the neighbour in sequence, and none at the end or off the path', () => {
    const seq = ['a', 'b', 'c'];
    expect(neighbourInSequence(seq, 'a')).toBe('b');
    expect(neighbourInSequence(seq, 'c')).toBeUndefined();
    expect(neighbourInSequence(seq, 'z')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/thread.test.ts`
Expected: FAIL — cannot resolve `../src/thread`.

- [ ] **Step 3: Implement `src/thread.ts`**

Read `content.threads['thread.main']?.sequence ?? []`. `nextUnvisited` returns the first id absent from `visited`; `neighbourInSequence` returns the id after `worldId`, or `undefined` if `worldId` is absent or last.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/thread.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/thread.ts tests/thread.test.ts
git commit -m "feat: add the thread sequence helper"
```

---

### Task 2: Thread presentation on the map

**Files:**
- Modify: `src/components/satyrn-map.ts`, `content/strings/ui.yaml`
- Test: `tests/components/map-modes.test.ts`

**Interfaces:**
- Consumes: Task 1's helpers.
- Produces: `satyrn-map` takes `mode: 'thread' | 'wander'` (default `'wander'`) and `store`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/map-modes.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { Store } from '../../src/store/store';
import '../../src/components/satyrn-map';

const text = (el: Element) => (el as any).shadowRoot.textContent as string;

function mount(mode: 'thread' | 'wander', visited: string[] = []) {
  const store = new Store({ storage: null, achievements: Object.values(getContent().achievements) });
  for (const world of visited) store.dispatch({ type: 'world.entered', world });
  const map: any = document.createElement('satyrn-map');
  map.store = store;
  map.mode = mode;
  document.body.append(map);
  return map;
}

describe('map modes', () => {
  it('thread mode marks the next unvisited Bead and offers to continue', async () => {
    const map = mount('thread', ['world.lantern-room']);
    await map.updateComplete;
    expect(text(map)).toContain('Continue the Thread');
    expect(text(map)).toContain('Rain-Gauge');
    expect(map.shadowRoot.querySelector('[data-next="true"] a')?.getAttribute('href')).toBe('#/world/world.rain-gauge-terrace');
  });

  it('thread mode lists every Bead in sequence order', async () => {
    const map = mount('thread');
    await map.updateComplete;
    const seq = getContent().threads['thread.main'].sequence;
    const hrefs = [...map.shadowRoot.querySelectorAll('a')].map((a: any) => a.getAttribute('href'));
    for (const id of seq) expect(hrefs).toContain(`#/world/${id}`);
  });

  it('thread mode says so when the Thread is walked', async () => {
    const map = mount('thread', getContent().threads['thread.main'].sequence);
    await map.updateComplete;
    expect(text(map)).toMatch(/walked the whole Thread/i);
    expect(map.shadowRoot.querySelector('[data-next="true"]')).toBeNull();
  });

  it('wander mode groups by act and offers no next CTA', async () => {
    const map = mount('wander');
    await map.updateComplete;
    expect(text(map)).toContain('Act I');
    expect(text(map)).not.toContain('Continue the Thread');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/map-modes.test.ts`
Expected: FAIL — thread mode does not exist.

- [ ] **Step 3: Implement the two presentations**

Add strings to `content/strings/ui.yaml`: `threadNarration`, `threadContinue`, `threadComplete`, `wanderHeading`. In `satyrn-map`, when `mode === 'thread'`: heading `mapHeading`, the Moon's narration line, a walked-count, the worlds in `threadSequence` order with the `nextUnvisited` one marked `data-next="true"` and wrapped with a Continue link; when the Thread is walked, the completion line. When `mode === 'wander'`: the existing act-grouped rendering (unchanged) with heading `wanderHeading`. Keep every world linked in both modes.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/components/map-modes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/satyrn-map.ts content/strings/ui.yaml tests/components/map-modes.test.ts
git commit -m "feat: give the map a thread presentation and a wander presentation"
```

---

### Task 3: Thread footer on a Bead

**Files:**
- Modify: `src/components/satyrn-world.ts`
- Test: `tests/components/world-modes.test.ts`

**Interfaces:**
- Consumes: Task 1's helpers; `satyrn-world` gains `mode: 'thread' | 'wander'`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/world-modes.test.ts
import { describe, it, expect } from 'vitest';
import { getContent } from '../../src/content';
import { Store } from '../../src/store/store';
import '../../src/components/satyrn-world';

const text = (el: Element) => (el as any).shadowRoot.textContent as string;

function mount(worldId: string, mode: 'thread' | 'wander') {
  const store = new Store({ storage: null, achievements: Object.values(getContent().achievements) });
  const world: any = document.createElement('satyrn-world');
  world.worldId = worldId;
  world.store = store;
  world.mode = mode;
  document.body.append(world);
  return world;
}

describe('world modes', () => {
  it('thread mode links on to the next Bead in sequence', async () => {
    const world = mount('world.lantern-room', 'thread');
    await world.updateComplete;
    expect(text(world)).toContain('Continue the Thread');
    expect(world.shadowRoot.querySelector('[data-next-bead]')?.getAttribute('href')).toBe('#/world/world.rain-gauge-terrace');
  });

  it('thread mode ends cleanly on the last Bead', async () => {
    const world = mount('world.commons-garden', 'thread');
    await world.updateComplete;
    expect(world.shadowRoot.querySelector('[data-next-bead]')).toBeNull();
    expect(text(world)).toMatch(/walked the whole Thread/i);
  });

  it('wander mode shows no thread footer', async () => {
    const world = mount('world.lantern-room', 'wander');
    await world.updateComplete;
    expect(world.shadowRoot.querySelector('[data-next-bead]')).toBeNull();
    expect(text(world)).not.toContain('Continue the Thread');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/world-modes.test.ts`
Expected: FAIL — no footer exists.

- [ ] **Step 3: Implement the footer**

Add `mode` to `satyrn-world`. After the mechanic, in thread mode render a `<nav class="thread-nav">` with a `[data-next-bead]` link to `neighbourInSequence`, titled "Continue the Thread"; if there is no neighbour, the `threadComplete` line. Always include a "Back to the Thread" link. In wander mode render "Back to the map" only.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/components/world-modes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/satyrn-world.ts tests/components/world-modes.test.ts
git commit -m "feat: continue the Thread from a Bead"
```

---

### Task 4: Wire the mode through the shell

**Files:**
- Modify: `src/components/satyrn-app.ts`
- Test: `tests/components/shell.test.ts` (add a case)

**Interfaces:**
- Consumes: Tasks 2–3.

- [ ] **Step 1: Write the failing test**

```ts
// append to tests/components/shell.test.ts
it('passes the stored mode to the map, and the thread route selects thread mode', async () => {
  const app: any = document.createElement('satyrn-app');
  document.body.append(app);
  await app.updateComplete;
  app.renderRoute({ name: 'thread' });
  await app.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  expect(app.store.getState().mode).toBe('thread');
  expect(app.renderRoot.querySelector('satyrn-map')?.mode).toBe('thread');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/components/shell.test.ts`
Expected: FAIL — the map has no `mode` property.

- [ ] **Step 3: Implement the wiring**

In `satyrn-app`, derive `mode` from `store.getState().mode`; on entering the `thread` route, dispatch `mode.changed: thread` so the toggle agrees; pass `.mode=${mode}` to `satyrn-map` (map and thread routes) and `satyrn-world`. Keep the toggle setting the store mode.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run`
Expected: PASS — including every existing test.

- [ ] **Step 5: Commit**

```bash
git add src/components/satyrn-app.ts tests/components/shell.test.ts
git commit -m "feat: drive the map and world views from the stored mode"
```

---

### Task 5: End-to-end mode walk

**Files:**
- Create: `tests/e2e/modes.spec.ts`

- [ ] **Step 1: Write the test**

```ts
// tests/e2e/modes.spec.ts
import { test, expect } from '@playwright/test';

test('Thread mode guides from one Bead to the next', async ({ page }) => {
  await page.goto('/#/thread');
  await page.getByRole('link', { name: /Lantern Room/i }).click();
  await expect(page.locator('satyrn-world')).toContainText(/Continue the Thread/i);
  await page.locator('satyrn-world [data-next-bead]').click();
  await expect(page.locator('satyrn-world')).toContainText(/Rain-Gauge/i);
});

test('Wander mode shows the Beads by act without a next CTA', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Wander' }).click();
  await expect(page.locator('satyrn-map')).toContainText(/Act I/);
  await expect(page.locator('satyrn-map')).not.toContainText(/Continue the Thread/);
  // Nothing is locked: a late Bead is reachable directly from the map.
  await expect(page.locator('satyrn-map a[href="#/world/world.commons-garden"]')).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails or passes**

Run: `npm run build && npx playwright test tests/e2e/modes.spec.ts`
Expected: FAIL until Tasks 1–4 are in place.

- [ ] **Step 3: Run the full gate**

Run: `npm run check`
Expected: strict content, tsc, all unit tests, build, and all e2e specs pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/modes.spec.ts
git commit -m "test: walk the Thread and wander the map end to end"
```

---

## Self-Review

**Spec coverage.** Thread mode becomes a guided journey along `thread.main.sequence` with the Moon narrating and a next-Bead path; Wander mode is the free, act-grouped map; nothing is locked, because both modes link every Bead.

**Type consistency.** `threadSequence`, `nextUnvisited`, `neighbourInSequence` are defined once (Task 1) and used by the map and world views. `mode` is a two-value union shared by both components and the shell.

**Review Focus.** Missing Bead (Wander still shows it; build's unreachable check guards), last Bead (Task 3's "ends cleanly"), everything visited (Task 2's "walked the whole Thread"), mode switch (Task 4's store wiring; Task 5's e2e), direct navigation (existing e2e specs already enter worlds directly and stay green).

**Proportion.** Four small implementation tasks, each with one test file, plus one e2e.