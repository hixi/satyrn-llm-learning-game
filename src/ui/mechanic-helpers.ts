import type { Store } from '../store/store';
import { content } from '../content/content';
import { parseStars } from '../game/worlds/scenario-helpers';
import { starsForMistakes } from '../game/worlds/logic-contract';

export interface Ctx {
  store: Store;
  sounds: { success(): void; fail(): void; click(): void };
}

export function el(tag: string, text?: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

export function button(text: string, onClick: () => void, opts?: { primary?: boolean; id?: string }): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  if (opts?.id) b.id = opts.id;
  if (opts?.primary) b.classList.add('primary');
  b.addEventListener('click', onClick);
  return b;
}

export function feedback(host: HTMLElement, text: string, ok: boolean): void {
  host.textContent = text;
  host.classList.toggle('good', ok);
  host.classList.toggle('bad', !ok);
}

export function completeMechanic(
  ctx: Ctx,
  mechanicId: string,
  worldId: string,
  mistakes: number,
  evidence: unknown,
): { stars: number } {
  const mechanic = content.mechanics[mechanicId];
  const bands = parseStars(mechanic?.params) ?? { three: 0, two: 2 };
  const stars = starsForMistakes(mistakes, bands);
  ctx.store.dispatch({ type: 'mechanic.completed', mechanic: mechanicId, world: worldId });
  ctx.store.dispatch({ type: 'evidence.submitted', mechanic: mechanicId, evidence });
  ctx.store.dispatch({ type: 'stars.awarded', world: worldId, stars });
  const world = content.worlds[worldId];
  if (world) {
    for (const conceptId of world.concepts) {
      ctx.store.dispatch({ type: 'concept.earned', concept: conceptId });
    }
  }
  ctx.sounds.success();
  return { stars };
}

export function skipWorld(ctx: Ctx, worldId: string): void {
  ctx.store.dispatch({ type: 'world.skipped', world: worldId });
  ctx.sounds.click();
}

export function mechanicShell(worldId: string, mechanicId: string): { section: HTMLElement; body: HTMLElement; status: HTMLElement } {
  void worldId;
  const mechanic = content.mechanics[mechanicId];
  const section = el('section', undefined, 'mechanic');
  section.setAttribute('aria-label', mechanic?.title ?? mechanicId);
  const h = el('h3', mechanic?.title ?? mechanicId);
  const desc = el('p', mechanic?.description ?? '');
  const body = el('div', undefined, 'mechanic-body');
  const status = el('div', undefined, 'mechanic-status');
  status.setAttribute('aria-live', 'polite');
  section.append(h, desc, body, status);
  return { section, body, status };
}

export function onCompleted(
  ctx: Ctx,
  mechanicId: string,
  fn: () => void,
): () => void {
  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    fn();
    return () => {};
  }
  return ctx.store.subscribe(() => {
    if (ctx.store.getState().completedMechanics.includes(mechanicId)) fn();
  });
}

export function solvedBox(stars: number, text = 'Solved. The Thread remembers.'): HTMLElement {
  const box = el('div', `★ ${stars} — ${text}`, 'solved');
  box.setAttribute('role', 'status');
  return box;
}
