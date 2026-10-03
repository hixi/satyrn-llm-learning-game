import { MAX_NAME_LENGTH, parseScenario } from '../../game/worlds/garden/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

export function renderGarden(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { seeds, communityBeads } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);

  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    const evidence = ctx.store.getState().evidence[mechanicId] as { name?: unknown } | undefined;
    const name = typeof evidence?.name === 'string' && evidence.name ? `“${evidence.name}” stands` : 'Your Bead stands';
    body.appendChild(solvedBox(1, `${name} in the garden. You walked the whole Thread.`));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  const visited = new Set<string>();
  let seed: string | null = null;
  const intro = el('p', 'Wander a Bead or two that others planted. Then name one of your own, choose a seed, and plant it.');
  body.appendChild(intro);
  const list = el('div');
  for (const bead of communityBeads) {
    const card = el('div');
    const title = el('h4', `${bead.name} — kept by ${bead.keeper}`);
    const about = el('p', bead.about);
    const visit = button(visited.has(bead.id) ? 'Wandered ✓' : `Wander ${bead.name}`, () => {
      visited.add(bead.id);
      visit.textContent = 'Wandered ✓';
      visit.setAttribute('aria-pressed', 'true');
    });
    visit.setAttribute('aria-pressed', visited.has(bead.id) ? 'true' : 'false');
    card.append(title, about, visit);
    list.appendChild(card);
  }
  body.appendChild(list);

  const nameLabel = el('label', 'Name your Bead');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = MAX_NAME_LENGTH;
  nameInput.setAttribute('aria-label', 'Name your Bead');
  nameInput.placeholder = 'e.g. The Patient Cup';
  nameLabel.appendChild(nameInput);
  body.appendChild(nameLabel);

  const seedFs = document.createElement('fieldset');
  const seedLegend = document.createElement('legend');
  seedLegend.textContent = 'Choose a seed';
  seedFs.appendChild(seedLegend);
  const seedRow = el('div', undefined, 'row');
  for (const s of seeds) {
    const b = button(s.name, () => {
      seed = s.id;
      for (const x of seedRow.querySelectorAll('button')) x.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
    });
    b.setAttribute('aria-pressed', seed === s.id ? 'true' : 'false');
    seedRow.appendChild(b);
  }
  seedFs.appendChild(seedRow);
  body.appendChild(seedFs);

  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');
  body.appendChild(fb);

  const plant = button(
    'Plant your Bead',
    () => {
      const name = nameInput.value.trim();
      if (visited.size === 0) {
        feedback(fb, 'Wander at least one Bead first — see how others planted.', false);
        ctx.sounds.fail();
        return;
      }
      if (!name) {
        feedback(fb, 'Give your Bead a name.', false);
        ctx.sounds.fail();
        return;
      }
      if (!seed) {
        feedback(fb, 'Choose a seed to plant it from.', false);
        ctx.sounds.fail();
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, 0, { usedFallback: false, name, seed, visited: [...visited] });
    },
    { primary: true },
  );
  body.appendChild(plant);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });
  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
