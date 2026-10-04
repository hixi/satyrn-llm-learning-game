import { describe, expect, test } from 'vitest';
import { Store } from '../src/store/store';
import { content } from '../src/content/content';
import { renderActCard, renderHud, renderJournal, renderMap, renderTitle } from '../src/views/shell';
import { renderWorld } from '../src/views/world';
import { renderDialogue } from '../src/ui/dialogue';
import { threadSequence } from '../src/thread';

function testStore(): Store {
  return new Store({ storage: null, achievements: Object.values(content.achievements) });
}

const sounds = {
  setEnabled(_on: boolean): void {},
  toggleBlip(): void {},
};

function host(): HTMLElement {
  document.body.innerHTML = '';
  const h = document.createElement('div');
  document.body.appendChild(h);
  return h;
}

function buttons(h: HTMLElement): HTMLButtonElement[] {
  return [...h.querySelectorAll('button')] as HTMLButtonElement[];
}

function clickButton(label: string, h: HTMLElement = document.body): void {
  const b = buttons(h).find((x) => x.textContent === label);
  if (!b) throw new Error(`button not found: ${label}`);
  b.click();
}

describe('HUD', () => {
  test('renders mode toggle pressed state, star total, and journal/sound buttons', () => {
    const store = testStore();
    const h = host();
    renderHud(h, store, sounds);
    expect(h.querySelector('[aria-pressed="true"]')?.textContent).toContain('Thread');
    expect(h.textContent).toContain('★ 0');
    expect(buttons(h).map((b) => b.textContent)).toContain('Journal');
    store.dispatch({ type: 'stars.awarded', world: 'world.lantern-room', stars: 3 });
    const again = host();
    renderHud(again, store, sounds);
    expect(again.textContent).toContain('★ 3');
  });

  test('mode toggle dispatches and sound toggle flips', () => {
    const store = testStore();
    let enabled = false;
    const h = host();
    renderHud(h, store, { setEnabled: (on) => (enabled = on), toggleBlip: () => {} });
    clickButton('Wander', h);
    expect(store.getState().mode).toBe('wander');
    clickButton('Sound: off', h);
    expect(store.getState().settings.soundOn).toBe(true);
    expect(enabled).toBe(true);
  });
});

describe('map and act cards', () => {
  test('thread map shows continue + all ten beads, wander map groups by act', () => {
    const store = testStore();
    store.dispatch({ type: 'prologue.seen' });
    const h = host();
    renderMap(h, store);
    expect(h.querySelector('h1')?.textContent).toBe('The Thread');
    expect(h.querySelectorAll('.bead-list li').length).toBe(10);
    store.dispatch({ type: 'mode.changed', mode: 'wander' });
    const w = host();
    renderMap(w, store);
    expect(w.querySelector('h1')?.textContent).toBe('All the Beads');
    expect(w.querySelectorAll('.act-group').length).toBe(4);
  });

  test('continue button enters the next bead; act card gates after first visit', () => {
    const store = testStore();
    store.dispatch({ type: 'prologue.seen' });
    const h = host();
    renderMap(h, store);
    clickButton('Continue the Thread', h);
    expect(store.getState().visitedWorlds).toContain('world.lantern-room');

    const card = host();
    renderMap(card, store);
    expect(card.querySelector('.act-card')).not.toBeNull();
    expect(card.querySelector('.act-card h1')?.textContent).toBe('Prologue');
    clickButton('Continue', card);
    expect(store.getState().seenActCards).toContain('prologue');
    const after = host();
    renderMap(after, store);
    expect(after.querySelector('.act-card')).toBeNull();
  });

  test('renderActCard renders copy per act and records seen', () => {
    const store = testStore();
    const card = renderActCard('act2', store);
    expect(card.querySelector('h1')?.textContent).toContain('Snags');
    expect(card.textContent).toContain('how would we know');
    clickButton('Continue', card);
    expect(store.getState().seenActCards).toContain('act2');
  });

  test('title walks three screens and records the prologue', () => {
    const store = testStore();
    const h = host();
    renderTitle(h, store);
    expect(h.querySelector('h2')?.textContent).toBe('The Thread');
    clickButton('Next', h);
    clickButton('Next', h);
    clickButton('Step onto the Thread', h);
    expect(store.getState().seenPrologue).toBe(true);
    const skip = host();
    renderTitle(skip, testStore());
    clickButton('Skip', skip);
    expect(skip.ownerDocument).toBeDefined();
  });
});

describe('journal', () => {
  test('tabs switch; journey lists stars; keepsake copies, loads, resets', async () => {
    const store = testStore();
    store.dispatch({ type: 'prologue.seen' });
    store.dispatch({ type: 'stars.awarded', world: 'world.lantern-room', stars: 3 });
    store.dispatch({ type: 'concept.earned', concept: 'concept.attention' });
    const h = host();
    renderJournal(h, store);
    expect(h.querySelector('h1')?.textContent).toBe("The Moon's Memory");
    clickButton('Cards', h);
    expect(h.textContent).toContain('Attention');
    clickButton('Honors', h);
    expect(h.textContent).toContain('No honors yet.');
    clickButton('Keepsake', h);
    const box = h.querySelector('textarea.keepsake-box') as HTMLTextAreaElement;
    expect(box).not.toBeNull();

    let clipboard = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (s: string) => (clipboard = s) },
      configurable: true,
    });
    clickButton('Copy keepsake', h);
    await Promise.resolve();
    expect(clipboard).toContain('world.lantern-room');
    expect(box.value).toContain('world.lantern-room');

    box.value = 'not json';
    clickButton('Load from box', h);
    expect(h.textContent).toContain('not a valid save');
    box.value = clipboard;
    clickButton('Load from box', h);
    expect(h.textContent).toContain('Keepsake loaded.');
    clickButton('Start over', h);
    expect(store.getState().visitedWorlds).toEqual([]);
  });
});

describe('world view', () => {
  const ctx = (store: Store) => ({ store, sounds: { success() {}, fail() {}, click() {} } });

  test('engine room toggles open and records a depth completion', () => {
    const store = testStore();
    const h = host();
    renderWorld(h, ctx(store), store, 'world.lantern-room');
    const details = h.querySelector('details.engine-room');
    expect(details).not.toBeNull();
    expect(details?.textContent).toContain('Attention is all you get');
    clickButton('Look beneath the surface', h);
    expect(store.getState().completedEngineRooms).toContain('world.lantern-room');
    expect(store.getState().achievements).toContain('achievement.tinkerer');
  });

  test('all three snag engine rooms earn the deep honor', () => {
    const store = testStore();
    for (const id of ['world.round-path', 'world.gate-of-orders', 'world.assayers-scale']) {
      const h = host();
      renderWorld(h, ctx(store), store, id);
      clickButton('Look beneath the surface', h);
    }
    expect(store.getState().achievements).toContain('achievement.deep-snags');
  });

  test('thread nav offers the next bead; unknown bead shows the fallback', () => {
    const store = testStore();
    const seq = threadSequence(content);
    const h = host();
    renderWorld(h, ctx(store), store, seq[0]);
    const next = buttons(h).find((b) => b.textContent?.startsWith('Continue the Thread'));
    expect(next?.textContent).toContain(content.worlds[seq[1]].title);
    const unknown = host();
    renderWorld(unknown, ctx(store), store, 'world.nope');
    expect(unknown.querySelector('h1')?.textContent).toBe('Unknown Bead');
  });
});

describe('dialogue', () => {
  test('gated choice hides until visited, then walks nodes', () => {
    const store = testStore();
    const dialogue = content.dialogues['dialogue.satyrn.intro'];
    const h = host();
    renderDialogue(h, {
      state: store.getState(),
      dialogue,
      speakerName: (id) => content.characters[id]?.name ?? id,
    });
    expect(h.textContent).not.toContain('I have been here before');
    store.dispatch({ type: 'world.entered', world: 'world.lantern-room' });
    const again = host();
    renderDialogue(again, {
      state: store.getState(),
      dialogue,
      speakerName: (id) => content.characters[id]?.name ?? id,
    });
    expect(again.textContent).toContain('I have been here before');
    clickButton('What can you see right now?', again);
    expect(again.textContent).toContain('Only the dark');
  });
});
