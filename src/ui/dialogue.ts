import { matchesCondition } from '../store/achievements';
import type { GameState, StoreEvent } from '../store/state';
import type { Dialogue } from '../content/types';

const NO_MATCH_EVENT: StoreEvent = { type: 'prologue.seen' };

export function visibleChoices(state: GameState, dialogue: Dialogue, nodeId: string) {
  const node = dialogue.nodes[nodeId];
  if (!node) return [];
  return node.choices.filter((c) => !c.condition || matchesCondition(state, NO_MATCH_EVENT, c.condition));
}

export function renderDialogue(
  host: HTMLElement,
  opts: {
    state: GameState;
    dialogue: Dialogue;
    speakerName: (id: string) => string;
    startNode?: string;
  },
): void {
  host.innerHTML = '';
  let nodeId = opts.startNode ?? opts.dialogue.start;
  const box = document.createElement('div');
  box.className = 'dialogue';
  host.appendChild(box);

  function draw(): void {
    box.innerHTML = '';
    const node = opts.dialogue.nodes[nodeId];
    if (!node) {
      box.remove();
      return;
    }
    const speaker = document.createElement('div');
    speaker.className = 'speaker';
    speaker.textContent = opts.speakerName(node.speaker);
    const text = document.createElement('p');
    text.textContent = node.text;
    box.append(speaker, text);
    const choices = document.createElement('div');
    choices.className = 'choices';
    const visible = visibleChoices(opts.state, opts.dialogue, nodeId);
    if (visible.length === 0) {
      const done = document.createElement('p');
      done.innerHTML = '<em>The keeper nods. The work waits below.</em>';
      box.appendChild(done);
      return;
    }
    for (const choice of visible) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => {
        if (!choice.next) {
          box.remove();
          return;
        }
        nodeId = choice.next;
        draw();
      });
      choices.appendChild(btn);
    }
    box.appendChild(choices);
  }
  draw();
}
