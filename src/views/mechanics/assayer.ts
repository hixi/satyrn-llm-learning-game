import { parseScenario } from '../../game/worlds/assayer/logic';
import type { Check } from '../../game/worlds/assayer/logic';
import { button, completeMechanic, el, feedback, mechanicShell, onCompleted, skipWorld, solvedBox, type Ctx } from '../../ui/mechanic-helpers';

function reading(check: Check, sound: boolean): string {
  if (check.kind === 'vanity') return 'excellent';
  if (check.kind === 'broken') return 'worthless';
  return sound ? 'sound' : 'unsound';
}

export function renderAssayer(host: HTMLElement, ctx: Ctx, worldId: string, mechanicId: string, params: unknown): void {
  const { items, checks } = parseScenario(params);
  const { section, body, status } = mechanicShell(worldId, mechanicId);
  host.appendChild(section);
  function showSolved(): void {
    body.innerHTML = '';
    status.innerHTML = '';
    body.appendChild(solvedBox(ctx.store.getState().stars[worldId] ?? 1, 'A check that can fail — and proof.'));
  }

  if (ctx.store.getState().completedMechanics.includes(mechanicId)) {
    showSolved();
    return;
  }
  onCompleted(ctx, mechanicId, showSolved);
  let relied: string | null = null;
  let marked: string | null = null;
  let mistakes = 0;
  const intro = el('p', 'The gleaming scale praises everything. Rely on a check that could actually fail — then mark the weight that is truly unsound.');
  body.appendChild(intro);
  const fb = el('p', '', 'feedback');
  fb.setAttribute('role', 'status');

  const checkRow = el('div', undefined, 'row');
  const itemRow = el('div', undefined, 'row');
  body.append(checkRow, itemRow, fb);

  function draw(): void {
    checkRow.innerHTML = '';
    itemRow.innerHTML = '';
    const checkFs = document.createElement('fieldset');
    const checkLegend = document.createElement('legend');
    checkLegend.textContent = 'Rely on a check';
    checkFs.appendChild(checkLegend);
    for (const check of checks) {
      const b = button(`${relied === check.id ? '● ' : ''}${check.label}`, () => {
        relied = check.id;
        draw();
      });
      b.setAttribute('aria-pressed', relied === check.id ? 'true' : 'false');
      checkFs.appendChild(b);
    }
    checkRow.appendChild(checkFs);
    const itemFs = document.createElement('fieldset');
    const itemLegend = document.createElement('legend');
    itemLegend.textContent = 'Mark the unsound weight';
    itemFs.appendChild(itemLegend);
    for (const item of items) {
      const b = button(`${marked === item.id ? '● ' : ''}${item.label}`, () => {
        marked = item.id;
        draw();
      });
      b.setAttribute('aria-pressed', marked === item.id ? 'true' : 'false');
      itemFs.appendChild(b);
    }
    itemRow.appendChild(itemFs);
    if (relied) {
      const check = checks.find((c) => c.id === relied);
      if (check) {
        const preview = el('p', `Readings under ${check.label}: ${items.map((i) => `${i.label} → ${reading(check, i.sound)}`).join('; ')}.`);
        fb.innerHTML = '';
        fb.appendChild(preview);
      }
    }
  }
  draw();

  const weigh = button(
    'Weigh the evidence',
    () => {
      const check = checks.find((c) => c.id === relied);
      const item = items.find((i) => i.id === marked);
      if (!check || !item) {
        feedback(fb, 'Choose a check to rely on and a weight to mark.', false);
        return;
      }
      if (check.kind !== 'honest') {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(
          fb,
          check.kind === 'vanity'
            ? 'The gleaming scale cannot fail — it calls everything excellent. That proves nothing.'
            : 'The stubborn scale rejects everything — it cannot pass. That proves nothing either.',
          false,
        );
        return;
      }
      if (item.sound) {
        mistakes += 1;
        ctx.sounds.fail();
        feedback(fb, `The assay reads ${item.label} as sound. The unsound weight is still out there.`, false);
        return;
      }
      completeMechanic(ctx, mechanicId, worldId, mistakes, {
        usedFallback: false,
        check: check.id,
        item: item.id,
      });
    },
    { primary: true },
  );
  body.appendChild(weigh);
  const skip = button('Continue without playing', () => {
    skipWorld(ctx, worldId);
    completeMechanic(ctx, mechanicId, worldId, 99, { usedFallback: true });

  });
  skip.classList.add('skip-link');
  body.appendChild(skip);
}
