import { parseScenario, simulate } from '../../game/worlds/cartwright/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

const RUN_TEXT: Record<string, string> = {
  success: 'The cart reaches the market and stops.',
  overshot: 'The cart bolts past the market — it never learned to stop.',
  'ran-out': 'The cart stalls before the market — the rig gives out.',
  'no-work': 'Nothing pulls the cart. Fit something that works.',
};

export function renderCartwright(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { goal, slots, components } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The rig arrives — and stops.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const chosen = new Map<string, string>();
  let mistakes = 0;
  const intro = el('p', `The market waits ${goal} measures down the road. Fit how it works, how far it may go, and how it knows it arrived.`);
  body.appendChild(intro);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function draw(): void {
    body.querySelectorAll('fieldset').forEach((f) => f.remove());
    for (const slot of slots) {
      const fs = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = slot.label;
      fs.appendChild(legend);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', slot.label);
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Choose…';
      sel.appendChild(empty);
      for (const c of components) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (chosen.get(slot.id) === c.id) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        if (sel.value) chosen.set(slot.id, sel.value);
        else chosen.delete(slot.id);
      });
      fs.appendChild(sel);
      body.insertBefore(fs, fb);
    }
  }
  draw();

  const send = button(
    'Send the cart',
    () => {
      const bag: Record<string, (typeof components)[number]> = {};
      for (const slot of slots) {
        const id = chosen.get(slot.id);
        const c = components.find((x) => x.id === id);
        if (c) bag[slot.id] = c;
      }
      const result = simulate(goal, bag);
      if (result !== 'success') {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, RUN_TEXT[result] ?? result, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        chosen: Object.fromEntries(chosen),
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
