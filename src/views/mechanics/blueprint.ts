import { parseScenario } from '../../game/worlds/blueprint/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderBlueprint(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { blueprint, clauses } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The Mason builds — and proves it fits.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const picked = new Set<string>();
  let mistakes = 0;
  const intro = el('p', `The drawing shows a wall ${blueprint.width} bricks wide and ${blueprint.height} high. Choose the clauses the Mason can build and check — wishes leave her waiting.`);
  body.appendChild(intro);
  const list = el('div', undefined, 'row');
  body.appendChild(list);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function draw(): void {
    list.innerHTML = '';
    for (const clause of clauses) {
      const b = button(`${picked.has(clause.id) ? '☑ ' : '☐ '}${clause.text}`, () => {
        if (picked.has(clause.id)) picked.delete(clause.id);
        else picked.add(clause.id);
        draw();
      });
      b.setAttribute('aria-pressed', picked.has(clause.id) ? 'true' : 'false');
      list.appendChild(b);
    }
  }
  draw();

  const build = button(
    'Ask the Mason to build',
    () => {
      const chosen = clauses.filter((c) => picked.has(c.id));
      if (chosen.some((c) => c.kind === 'vague')) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, 'The Mason waits. "Sturdy enough" cannot be measured — give her numbers.', false);
        return;
      }
      const widths = chosen.filter((c) => c.kind === 'width');
      const heights = chosen.filter((c) => c.kind === 'height');
      if (widths.length !== 1 || heights.length !== 1) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, 'The spec needs exactly one width and one height.', false);
        return;
      }
      const [w] = widths;
      const [h] = heights;
      if (w.value !== blueprint.width || h.value !== blueprint.height) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `She builds ${w.value} by ${h.value} — then measures it against the drawing (${blueprint.width} by ${blueprint.height}). It does not fit.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        clauses: [...picked],
      });
    },
    { primary: true },
  );
  body.appendChild(build);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
