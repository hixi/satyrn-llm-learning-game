import { parseScenario as parseLantern } from '../../game/worlds/lantern/logic';
import { completeMechanic, el, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';
import { button } from '../../ui/mechanic-helpers';

export function renderLantern(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { spots } = parseLantern(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);

  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'Every corner is lit.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);

  const lit = new Set<string>();
  const grid = el('div', undefined, 'row');
  body.appendChild(grid);
  const fb = el('p', '', 'feedback');
  body.appendChild(fb);

  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });
  });
  skip.classList.add('skip-link');

  function draw(): void {
    grid.innerHTML = '';
    for (const spot of spots) {
      const isLit = lit.has(spot.id);
      const b = button(`${isLit ? '● ' : '○ '}${spot.label}`, () => {
        if (lit.has(spot.id)) return;
        lit.add(spot.id);
        if (lit.size >= spots.length) {
          completeMechanic(ctx, mechanicId, worldId, 0, { usedFallback: false, lit: [...lit] });
          return;
        }
        draw();
      });
      b.setAttribute('aria-pressed', isLit ? 'true' : 'false');
      b.disabled = isLit;
      grid.appendChild(b);
    }
    fb.textContent = `${lit.size} of ${spots.length} corners lit.`;
  }
  draw();
  body.appendChild(skip);
}
