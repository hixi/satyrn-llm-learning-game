import { parseScenario } from '../../game/worlds/well/logic';
import type { Source } from '../../game/worlds/well/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderWell(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { wellCapacity, tasks } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The well holds what is private.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const routed = new Map<string, Source>();
  let mistakes = 0;
  const intro = el('p', `Your well holds ${wellCapacity} measures. Sensitive needs must stay in the well; the rest may go down the pipe.`);
  body.appendChild(intro);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function wellUsed(): number {
    return tasks.filter((t) => routed.get(t.id) === 'well').reduce((s, t) => s + t.need, 0);
  }

  function draw(): void {
    body.querySelectorAll('fieldset').forEach((f) => f.remove());
    for (const task of tasks) {
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = `${task.label} (needs ${task.need}${task.sensitive ? ', private' : ''})`;
      fs.appendChild(legend);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Route: ${task.label}`);
      for (const [value, label] of [['', 'Choose…'], ['well', 'Well'], ['pipe', 'Pipe']] as const) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        if ((routed.get(task.id) ?? '') === value) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        if (sel.value === 'well' || sel.value === 'pipe') routed.set(task.id, sel.value);
        else routed.delete(task.id);
        draw();
      });
      fs.appendChild(sel);
      body.insertBefore(fs, fb);
    }
    fb.textContent = `Well: ${wellUsed()} of ${wellCapacity} measures.`;
  }
  draw();

  const seal = button(
    'Seal the day',
    () => {
      if (routed.size !== tasks.length) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, 'Every need still wants a route.', false);
        return;
      }
      const leaked = tasks.filter((t) => t.sensitive && routed.get(t.id) !== 'well');
      if (leaked.length > 0) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `Private work leaves the house: ${leaked.map((t) => t.label).join(', ')} must stay in the well.`, false);
        return;
      }
      if (wellUsed() > wellCapacity) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `The well overflows: ${wellUsed()} measures for a well of ${wellCapacity}.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        routed: Object.fromEntries(routed),
      });
    },
    { primary: true },
  );
  body.appendChild(seal);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
