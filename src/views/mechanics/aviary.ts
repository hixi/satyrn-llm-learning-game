import { parseScenario } from '../../game/worlds/aviary/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderAviary(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { birds, tasks } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'Every errand has its bird.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const assigned = new Map<string, string>();
  let mistakes = 0;
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function draw(): void {
    body.querySelectorAll('fieldset').forEach((f) => f.remove());
    for (const task of tasks) {
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = task.label;
      fs.appendChild(legend);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `Bird for: ${task.label}`);
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose a bird…';
      sel.appendChild(empty);
      for (const bird of birds) {
        const opt = document.createElement('option');
        opt.value = bird.id;
        opt.textContent = bird.name;
        if (assigned.get(task.id) === bird.id) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        if (sel.value) assigned.set(task.id, sel.value);
        else assigned.delete(task.id);
      });
      fs.appendChild(sel);
      body.insertBefore(fs, fb);
    }
    const used = [...assigned.values()];
    const dupes = used.filter((v, i) => used.indexOf(v) !== i);
    fb.textContent =
      dupes.length > 0
        ? `Each bird carries one errand: ${dupes.join(', ')} is lent twice.`
        : `${assigned.size} of ${tasks.length} errands matched.`;
  }
  draw();

  const send = button(
    'Send the birds',
    () => {
      const used = [...assigned.values()];
      if (new Set(used).size !== used.length) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, 'One bird, one errand — a bird lent twice cannot fly both ways.', false);
        return;
      }
      for (const task of tasks) {
        const birdId = assigned.get(task.id);
        const bird = birds.find((b) => b.id === birdId);
        if (!bird || !task.needs.every((n) => bird.traits.includes(n))) {
          mistakes += 1;
          ctx.sounds.fail();
          feedback(fb, `"${task.label}" is mismatched — match the temperament to the task.`, false);
          return;
        }
      }
      if (assigned.size !== tasks.length) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, 'An errand still waits for its bird.', false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        assigned: Object.fromEntries(assigned),
      });
    },
    { primary: true },
  );
  body.appendChild(send);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
