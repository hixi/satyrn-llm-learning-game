import { parseScenario } from '../../game/worlds/round-path/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderRoundPath(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { steps, cycleStart, cycleLength } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The circle is broken; the work stands.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const picked = new Set<number>();
  let mistakes = 0;
  const intro = el('p', 'The mule walked all night. Mark the steps that make up one full turn of the repeating circle — then break it.');
  body.appendChild(intro);
  const list = el('div');
  body.appendChild(list);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function draw(): void {
    list.innerHTML = '';
    steps.forEach((step, i) => {
      const b = button(`${picked.has(i) ? '◉' : '○'} ${i + 1}. ${step.label}`, () => {
        if (picked.has(i)) picked.delete(i);
        else picked.add(i);
        draw();
      });
      b.setAttribute('aria-pressed', picked.has(i) ? 'true' : 'false');
      list.appendChild(b);
    });
    fb.textContent = `${picked.size} steps marked.`;
  }
  draw();

  const brk = button(
    'Break the loop',
    () => {
      const want = new Set<number>();
      for (let i = 0; i < cycleLength; i++) want.add(cycleStart + i);
      const same = picked.size === want.size && [...picked].every((i) => want.has(i));
      if (!same) {
        mistakes += 1;
        ctx.sounds.fail();
        const labels = [...want].map((i) => `"${steps[i]?.label}"`).join(', ');
        feedback(fb, `Not quite — one full turn of the circle is ${cycleLength} steps: ${labels}. Keep the morning's work out of it.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        picked: [...picked],
      });
    },
    { primary: true },
  );
  body.appendChild(brk);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
