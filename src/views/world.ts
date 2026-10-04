import { content } from '../content/content';
import type { Store } from '../store/store';
import { neighbourInSequence, nextUnvisited, threadSequence } from '../thread';
import { navigate } from './shell';
import { renderDialogue } from '../ui/dialogue';
import { renderMechanic } from './mechanics/index';
import { button, el, type Ctx } from '../ui/mechanic-helpers';

export function renderWorld(host: HTMLElement, ctx: Ctx, store: Store, worldId: string): void {
  const world = content.worlds[worldId];
  if (!world) {
    host.append(el('h1', 'Unknown Bead'), el('p', 'That Bead is not on the Thread.'));
    host.appendChild(button('Back to the map', () => navigate({ name: 'map' }), { primary: true }));
    return;
  }
  host.appendChild(el('h1', world.title, 'bead-title'));
  host.appendChild(el('p', world.summary, 'summary'));
  const keeper = world.keeper ? content.characters[world.keeper] : undefined;
  if (keeper) host.appendChild(el('p', `${keeper.name}, ${keeper.title ?? ''} — ${keeper.description}`));
  host.appendChild(el('p', world.intro, 'intro'));

  if (world.dialogue && content.dialogues[world.dialogue]) {
    const box = el('div');
    host.appendChild(box);
    renderDialogue(box, {
      state: store.getState(),
      dialogue: content.dialogues[world.dialogue],
      speakerName: (id) => content.characters[id]?.name ?? id,
    });
  }

  const mechanic = content.mechanics[world.mechanic];
  if (mechanic) {
    renderMechanic(host, ctx, world.id, mechanic.id, mechanic.params);

    if (world.engineRoom) {
      const details = document.createElement('details');
      details.className = 'engine-room';
      const summary = document.createElement('summary');
      const done = store.getState().completedEngineRooms.includes(world.id);
      summary.textContent = done ? `✓ ${world.engineRoom.title}` : world.engineRoom.title;
      const body = el('p', world.engineRoom.body);
      details.append(summary, body);
      if (!done) {
        const open = button('Look beneath the surface', () => {
          store.dispatch({ type: 'world.engineRoom.completed', world: world.id });
          summary.textContent = `✓ ${world.engineRoom!.title}`;
        });
        open.classList.add('skip-link');
        details.appendChild(open);
      }
      host.appendChild(details);
    }

    const concepts = el('div', undefined, 'concepts');
    for (const conceptId of world.concepts) {
      const concept = content.concepts[conceptId];
      if (!concept) continue;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = concept.term;
      const short = el('p', concept.short);
      const b = el('p', concept.body);
      details.append(summary, short, b);
      concepts.appendChild(details);
    }
    if (concepts.children.length) {
      host.appendChild(el('h2', 'What this Bead teaches'));
      host.appendChild(concepts);
    }
  }

  const row = el('div', undefined, 'row');
  const strings = content.strings['strings.ui']?.values ?? {};
  if (store.getState().mode === 'thread') {
    const sequence = threadSequence(content);
    const next = neighbourInSequence(sequence, world.id) ?? nextUnvisited(sequence, store.getState().visitedWorlds);
    if (next && next !== world.id && content.worlds[next]) {
      row.append(
        button(
          `${strings.threadContinue ?? 'Continue the Thread'} → ${content.worlds[next].title}`,
          () => {
            store.dispatch({ type: 'world.entered', world: next });
            navigate({ name: 'world', worldId: next });
          },
          { primary: true },
        ),
      );
    } else if (!next) {
      row.append(el('p', strings.threadComplete ?? 'You have walked the whole Thread.'));
    }
  }
  row.append(button(strings.backToMap ?? 'Back to the map', () => navigate({ name: 'map' })));
  host.appendChild(row);
}
