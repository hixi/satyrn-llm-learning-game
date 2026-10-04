import { content } from '../content/content';
import type { Store } from '../store/store';
import { nextUnvisited, threadSequence } from '../thread';
import { routeToHash, type Route } from '../router';
import { button, el } from '../ui/mechanic-helpers';

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function navigateHash(hash: string): void {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = hash;
}

let returnTo = '#/';

export function getReturnTo(): string {
  return returnTo;
}

export function setReturnTo(hash: string): void {
  returnTo = hash;
}

const ACT_LABELS: Record<string, string> = {
  prologue: 'Prologue',
  act1: 'Act I — The Making',
  act2: 'Act II — The Snags',
  act3: 'Act III — The Method and the Commons',
};

const ACT_ORDER = ['prologue', 'act1', 'act2', 'act3'] as const;

function firstUnseenAct(sequence: string[], visited: string[], seen: string[]): string | undefined {
  const seenWorlds = new Set(visited);
  for (const act of ACT_ORDER) {
    const group = sequence.filter((id) => content.worlds[id]?.act === act);
    if (!group.length || seen.includes(act)) continue;
    if (group.some((id) => seenWorlds.has(id))) return act;
  }
  return undefined;
}

export function renderActCard(act: string, store: Store): HTMLElement {
  const strings = content.strings['strings.ui']?.values ?? {};
  const card = el('section', undefined, 'act-card');
  card.setAttribute('aria-label', ACT_LABELS[act] ?? act);
  card.append(
    el('h1', ACT_LABELS[act] ?? act),
    el('p', strings[`actCard.${act}`] ?? strings.threadNarration ?? ''),
    button('Continue', () => store.dispatch({ type: 'actCard.seen', act }), { primary: true }),
  );
  return card;
}

export function renderHud(host: HTMLElement, store: Store, sounds: { setEnabled(on: boolean): void; toggleBlip(): void }): void {
  host.innerHTML = '';
  host.className = 'hud';
  const state = store.getState();

  const modeGroup = el('div', undefined, 'mode-group');
  const threadBtn = button(state.mode === 'thread' ? '● Thread' : 'Thread', () => {
    store.dispatch({ type: 'mode.changed', mode: 'thread' });
    if (window.location.hash.startsWith('#/world')) navigate({ name: 'map' });
  });
  threadBtn.setAttribute('aria-pressed', state.mode === 'thread' ? 'true' : 'false');
  const wanderBtn = button(state.mode === 'wander' ? '● Wander' : 'Wander', () => {
    store.dispatch({ type: 'mode.changed', mode: 'wander' });
    if (window.location.hash.startsWith('#/world')) navigate({ name: 'map' });
  });
  wanderBtn.setAttribute('aria-pressed', state.mode === 'wander' ? 'true' : 'false');
  modeGroup.append(threadBtn, wanderBtn);

  const stars = el('span', undefined, 'stars');
  const total = Object.values(state.stars).reduce((s, n) => s + n, 0);
  stars.textContent = `★ ${total} · ${state.visitedWorlds.length} beads`;

  const spacer = el('span', undefined, 'spacer');
  const journal = button('Journal', () => {
    setReturnTo(window.location.hash || '#/');
    navigate({ name: 'journal' });
  });
  const sound = button(`Sound: ${state.settings.soundOn ? 'on' : 'off'}`, () => {
    const on = !store.getState().settings.soundOn;
    store.dispatch({ type: 'settings.changed', settings: { soundOn: on } });
    sounds.setEnabled(on);
    if (on) sounds.toggleBlip();
  });
  sound.setAttribute('aria-pressed', state.settings.soundOn ? 'true' : 'false');
  host.append(modeGroup, stars, spacer, journal, sound);
}

export function renderTitle(host: HTMLElement, store: Store): void {
  host.innerHTML = '';
  const strings = content.strings['strings.ui']?.values ?? {};
  host.appendChild(el('h1', strings.appTitle ?? 'Satyrn — The Thread', 'app-title'));
  const screens = [
    {
      heading: 'The Thread',
      body: 'You are the Wayfarer, walking a thread between ten small handmade worlds. Each world holds a small system built by its keeper — and you learn how it works by working with it.',
    },
    {
      heading: 'Your companions',
      body: 'The Satyrn walks with you: quick, curious, easily distracted. The Moon remembers the journey and asks how you could know something is true. Ten keepers tend the worlds ahead.',
    },
    {
      heading: 'How to play',
      body: 'Click or tap to act. Tab reaches every button. Sound is off until you ask. Nothing here can trap you: every Bead can be skipped.',
    },
  ];
  let screen = 0;
  const card = el('div');
  host.appendChild(card);
  function draw(): void {
    card.innerHTML = '';
    const spec = screens[screen];
    card.append(el('h2', spec.heading), el('p', spec.body));
    const row = el('div', undefined, 'row');
    if (screen < screens.length - 1) {
      row.append(
        button('Next', () => {
          screen += 1;
          draw();
        }),
        button('Skip', () => finish()),
      );
    } else {
      row.append(
        button('Step onto the Thread', () => finish(), { primary: true }),
      );
    }
    card.appendChild(row);
  }
  function finish(): void {
    store.dispatch({ type: 'prologue.seen' });
    navigate({ name: 'map' });
  }
  draw();
}

export function renderMap(host: HTMLElement, store: Store): void {
  host.innerHTML = '';
  const state = store.getState();
  const sequence = threadSequence(content);
  if (state.mode === 'thread') {
    const act = firstUnseenAct(sequence, state.visitedWorlds, state.seenActCards);
    if (act) {
      host.appendChild(renderActCard(act, store));
      return;
    }
  }
  const heading = state.mode === 'thread' ? 'The Thread' : 'All the Beads';
  host.appendChild(el('h1', heading));
  const narration = content.strings['strings.ui']?.values.threadNarration;
  if (state.mode === 'thread' && narration) host.appendChild(el('p', narration));
  const solved = sequence.filter((id) => (state.stars[id] ?? 0) > 0).length;
  host.appendChild(el('p', `${sequence.length} beads, ${solved} solved.`));

  if (state.mode === 'thread') {
    const next = nextUnvisited(sequence, state.visitedWorlds);
    if (next) {
      host.appendChild(
        button(
          'Continue the Thread',
          () => {
            store.dispatch({ type: 'world.entered', world: next });
            navigate({ name: 'world', worldId: next });
          },
          { primary: true, id: 'map-continue' },
        ),
      );
    } else {
      host.appendChild(el('p', 'You have walked the whole Thread.'));
    }
    const list = el('ul', undefined, 'bead-list');
    for (const id of sequence) {
      const world = content.worlds[id];
      if (!world) continue;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#/world/${id}`;
      a.addEventListener('click', () => store.dispatch({ type: 'world.entered', world: id }));
      const done = (state.stars[id] ?? 0) > 0;
      a.textContent = `${id === next ? '➤ ' : ''}${world.title}${done ? ' ★' : ''}`;
      const meta = el('span', world.summary, 'meta');
      a.appendChild(meta);
      li.appendChild(a);
      list.appendChild(li);
    }
    host.appendChild(list);
  } else {
    for (const act of ACT_ORDER) {
      const group = sequence.filter((id) => content.worlds[id]?.act === act);
      if (!group.length) continue;
      const section = el('section', undefined, 'act-group');
      section.appendChild(el('h2', ACT_LABELS[act] ?? act));
      const list = el('ul', undefined, 'bead-list');
      for (const id of group) {
        const world = content.worlds[id];
        if (!world) continue;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#/world/${id}`;
        a.addEventListener('click', () => store.dispatch({ type: 'world.entered', world: id }));
        a.textContent = world.title;
        const done = (state.stars[id] ?? 0) > 0;
        if (done) a.textContent += ' ★';
        const meta = el('span', world.summary, 'meta');
        a.appendChild(meta);
        li.appendChild(a);
        list.appendChild(li);
      }
      section.appendChild(list);
      host.appendChild(section);
    }
  }
}

export function renderJournal(host: HTMLElement, store: Store): void {
  host.innerHTML = '';
  host.appendChild(el('h1', "The Moon's Memory"));
  const tabs = el('div', undefined, 'journal-tabs');
  host.appendChild(tabs);
  const body = el('div');
  host.appendChild(body);
  let tab = 'Journey';
  const state = () => store.getState();

  function draw(): void {
    tabs.innerHTML = '';
    body.innerHTML = '';
    for (const name of ['Journey', 'Cards', 'Honors', 'Keepsake']) {
      const b = button(name, () => {
        tab = name;
        draw();
      });
      b.setAttribute('aria-pressed', tab === name ? 'true' : 'false');
      tabs.appendChild(b);
    }
    if (tab === 'Journey') {
      const s = state();
      const stars = Object.entries(s.stars);
      const total = stars.reduce((sum, [, n]) => sum + n, 0);
      const lines = [`${s.visitedWorlds.length} beads visited, ${total} stars.`];
      for (const [world, n] of stars) lines.push(`${content.worlds[world]?.title ?? world}: ${n} ★`);
      if (s.skippedWorlds.length) lines.push(`Skipped honestly: ${s.skippedWorlds.length}.`);
      const ul = el('ul');
      for (const line of lines) {
        const li = document.createElement('li');
        li.textContent = line;
        ul.appendChild(li);
      }
      body.append(el('h2', 'Journey'), ul);
    } else if (tab === 'Cards') {
      const s = state();
      const cards = s.earnedConcepts.length
        ? s.earnedConcepts.map((id) => `${content.concepts[id]?.term ?? id}: ${content.concepts[id]?.short ?? ''}`)
        : ['No cards yet — solve a Bead to earn one.'];
      const ul = el('ul');
      for (const c of cards) {
        const li = document.createElement('li');
        li.textContent = c;
        ul.appendChild(li);
      }
      body.append(el('h2', 'Cards'), ul);
    } else if (tab === 'Honors') {
      const s = state();
      const honors = s.achievements.length
        ? s.achievements.map((id) => `${content.achievements[id]?.title ?? id} — ${content.achievements[id]?.description ?? ''}`)
        : ['No honors yet.'];
      const ul = el('ul');
      for (const h of honors) {
        const li = document.createElement('li');
        li.textContent = h;
        ul.appendChild(li);
      }
      body.append(el('h2', 'Honors'), ul);
    } else {
      body.appendChild(el('h2', 'Keepsake'));
      body.appendChild(el('p', 'Your progress lives in this browser. Copy it out, paste one back in, or start over.'));
      const row = el('div', undefined, 'row');
      const status = el('p', '', 'feedback');
      status.setAttribute('role', 'status');
      const box = document.createElement('textarea');
      box.className = 'keepsake-box';
      box.setAttribute('aria-label', 'Keepsake code');
      box.placeholder = 'Paste a keepsake code here to import it.';
      row.append(
        button('Copy keepsake', async () => {
          box.value = store.export();
          try {
            await navigator.clipboard.writeText(box.value);
            status.textContent = 'Keepsake copied to clipboard.';
            status.className = 'feedback good';
          } catch {
            box.select();
            status.textContent = 'Clipboard refused — the code is selected above; copy it by hand.';
            status.className = 'feedback bad';
          }
        }),
        button('Load from box', () => {
          if (!box.value.trim()) {
            status.textContent = 'Paste a keepsake code into the box first.';
            status.className = 'feedback bad';
            return;
          }
          try {
            store.import(box.value);
            status.textContent = 'Keepsake loaded.';
            status.className = 'feedback good';
          } catch {
            status.textContent = 'Import failed: not a valid save.';
            status.className = 'feedback bad';
          }
        }),
        button('Start over', () => {
          store.reset();
          status.textContent = 'A new Thread begins.';
          status.className = 'feedback good';
        }),
      );
      body.append(row, box, status);
    }
    body.appendChild(button('Back', () => navigateHash(getReturnTo())));
  }
  draw();
}

export function renderNotFound(host: HTMLElement, path: string): void {
  host.innerHTML = '';
  host.append(el('h1', 'Not on the Thread'), el('p', 'That path leads nowhere — yet.'));
  host.appendChild(button('Back to the map', () => navigate({ name: 'map' }), { primary: true }));
}
