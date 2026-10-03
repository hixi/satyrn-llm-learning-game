import { admits, parseScenario } from '../../game/worlds/gate/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderGate(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { travellers, orders } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The order stands against every case.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  let chosen: string | null = null;
  let mistakes = 0;
  const intro = el('p', 'Four travellers approach. Choose the one standing order that admits exactly those who should enter — the gate reads literally.');
  body.appendChild(intro);
  const list = el('ul');
  for (const t of travellers) {
    const li = document.createElement('li');
    li.textContent = `${t.label} — should ${t.shouldEnter ? 'enter' : 'wait'}`;
    list.appendChild(li);
  }
  body.appendChild(list);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  const group = el('div', undefined, 'row');
  body.appendChild(group);
  function draw(): void {
    group.innerHTML = '';
    for (const order of orders) {
      const b = button(`${chosen === order.id ? '● ' : ''}${order.text}`, () => {
        chosen = order.id;
        draw();
      });
      b.setAttribute('aria-pressed', chosen === order.id ? 'true' : 'false');
      group.appendChild(b);
    }
  }
  draw();

  const seal = button(
    'Seal the order',
    () => {
      const order = orders.find((o) => o.id === chosen);
      if (!order) {
        feedback(fb, 'Choose an order first.', false);
        return;
      }
      const failures = travellers.filter((t) => admits(order, t) !== t.shouldEnter);
      if (failures.length > 0) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `The gate misreads ${failures.length} case(s): ${failures.map((t) => t.label).join('; ')}.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, { usedFallback: false, order: order.id });
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
