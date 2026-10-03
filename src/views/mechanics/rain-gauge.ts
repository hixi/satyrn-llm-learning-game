import { parseScenario } from '../../game/worlds/rain-gauge/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderRainGauge(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { capacity, drops } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'The cup holds what the terrace needs.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const kept = new Set<string>();
  let mistakes = 0;
  const list = el('div');
  body.appendChild(list);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  function draw(): void {
    list.innerHTML = '';
    for (const drop of drops) {
      const row = el('div', undefined, 'row');
      const label = el('span', `${drop.label}${drop.essential ? '' : ' (chatter)'}`);
      const toggle = button(kept.has(drop.id) ? `Keep ✓` : 'Keep', () => {
        if (kept.has(drop.id)) kept.delete(drop.id);
        else kept.add(drop.id);
        draw();
      });
      toggle.setAttribute('aria-pressed', kept.has(drop.id) ? 'true' : 'false');
      toggle.setAttribute('aria-label', `Keep ${drop.label}`);
      row.append(label, toggle);
      list.appendChild(row);
    }
    fb.textContent = `Cup: ${kept.size} of ${capacity} drops.`;
  }
  draw();

  const pour = button(
    'Pour the cup',
    () => {
      const keptDrops = drops.filter((d) => kept.has(d.id));
      const essentials = drops.filter((d) => d.essential);
      const missing = essentials.filter((d) => !kept.has(d.id));
      const chatter = keptDrops.filter((d) => !d.essential);
      if (keptDrops.length > capacity) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `The cup overflows: ${keptDrops.length} kept, room for ${capacity}. Let something fall.`, false);
        return;
      }
      if (missing.length > 0) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `The plants thirst: missing ${missing.map((d) => d.label).join(', ')}.`, false);
        return;
      }
      if (chatter.length > 0) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `Chatter in the cup: ${chatter.map((d) => d.label).join(', ')}. Keep only what the plants need.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, { usedFallback: false, kept: [...kept] });
    },
    { primary: true },
  );
  body.appendChild(pour);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
