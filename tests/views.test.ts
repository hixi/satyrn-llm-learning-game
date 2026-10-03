import { beforeEach, describe, expect, test } from 'vitest';
import { Store } from '../src/store/store';
import { content } from '../src/content/content';
import type { Ctx } from '../src/ui/mechanic-helpers';
import { renderMechanic } from '../src/views/mechanics/index';

function setup() {
  const store = new Store({ storage: null, achievements: Object.values(content.achievements) });
  const sounds = { success() {}, fail() {}, click() {} };
  const ctx: Ctx = { store, sounds };
  document.body.innerHTML = '';
  return { store, ctx };
}

function render(worldId: string) {
  const { store, ctx } = setup();
  const world = content.worlds[worldId];
  const host = document.createElement('div');
  document.body.appendChild(host);
  renderMechanic(host, ctx, world.id, world.mechanic, content.mechanics[world.mechanic].params);
  return { store, host };
}

function click(name: string | RegExp, host: HTMLElement = document.body): void {
  const btn = [...host.querySelectorAll('button')].find((b) => (typeof name === 'string' ? b.textContent === name : name.test(b.textContent ?? '')));
  if (!btn) throw new Error(`button not found: ${name}`);
  (btn as HTMLButtonElement).click();
}

function select(label: string, value: string, host: HTMLElement = document.body): void {
  const sel = host.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement | null;
  if (!sel) throw new Error(`select not found: ${label}`);
  sel.value = value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('lantern', () => {
  test('lights every spot and completes with 3 stars', () => {
    const { store, host } = render('world.lantern-room');
    const buttons = [...host.querySelectorAll('.mechanic-body .row button')];
    expect(buttons.length).toBe(4);
    for (const b of buttons) (b as HTMLButtonElement).click();
    expect(store.getState().completedMechanics).toContain('mechanic.lantern');
    expect(store.getState().stars['world.lantern-room']).toBe(3);
    expect(host.querySelector('.mechanic-body .solved') ?? host.querySelector('.mechanic-status .solved')).not.toBeNull();
  });

  test('skip records an honest skip', () => {
    const { store, host } = render('world.lantern-room');
    click('Continue without playing', host);
    expect(store.getState().skippedWorlds).toContain('world.lantern-room');
    expect(store.getState().achievements).toContain('achievement.wanderer');
  });
});

describe('rain-gauge', () => {
  test('rejects an overflowing cup, then solves with the five essentials', () => {
    const { store, host } = render('world.rain-gauge-terrace');
    for (const label of ['seed', 'root', 'shoot', 'bloom', 'harvest', 'chatter']) {
      (host.querySelector(`button[aria-label="Keep ${label}"]`) as HTMLButtonElement).click();
      host.querySelectorAll('.mechanic-body .row');
    }
    click('Pour the cup', host);
    expect(host.querySelector('.mechanic p.feedback')?.textContent).toMatch(/overflows|Chatter/);
    expect(store.getState().completedMechanics).not.toContain('mechanic.rain-gauge');
  });

  test('solve path keeps only essentials', () => {
    const { store, host } = render('world.rain-gauge-terrace');
    for (const label of ['seed', 'root', 'shoot', 'bloom', 'harvest']) {
      (host.querySelector(`button[aria-label="Keep ${label}"]`) as HTMLButtonElement).click();
    }
    click('Pour the cup', host);
    expect(store.getState().completedMechanics).toContain('mechanic.rain-gauge');
  });
});

describe('aviary', () => {
  test('wrong bird fails, right birds solve', () => {
    const { store, host } = render('world.aviary-of-whispers');
    select('Bird for: carry many small messages quickly', 'patient', host);
    select('Bird for: tend a fragile nest for hours', 'swift', host);
    select('Bird for: survey the whole valley at once', 'vast', host);
    click('Send the birds', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.aviary');
    expect(host.querySelector('.mechanic p.feedback')?.textContent).toMatch(/mismatched/);

    select('Bird for: carry many small messages quickly', 'swift', host);
    select('Bird for: tend a fragile nest for hours', 'patient', host);
    click('Send the birds', host);
    expect(store.getState().completedMechanics).toContain('mechanic.aviary');
    expect(store.getState().achievements).toContain('achievement.right-bird');
  });
});

describe('cartwright', () => {
  test('bell rig bolts, right rig arrives', () => {
    const { store, host } = render('world.cartwrights-yard');
    select('how it works', 'steady', host);
    select('how far it may go', 'budget', host);
    select('how it knows it arrived', 'bell', host);
    click('Send the cart', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.cartwright');
    select('how it knows it arrived', 'marker', host);
    click('Send the cart', host);
    expect(store.getState().completedMechanics).toContain('mechanic.cartwright');
  });
});

describe('round-path', () => {
  test('wrong steps fail, the true cycle breaks the loop', () => {
    const { store, host } = render('world.round-path');
    const buttons = [...host.querySelectorAll('.mechanic-body button')].filter((b) => /^\s*[○◉]/.test(b.textContent ?? ''));
    (buttons[0] as HTMLButtonElement).click();
    click('Break the loop', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.round-path');
    expect(host.querySelector('.mechanic p.feedback')?.textContent).toMatch(/one full turn/);
  });

  test('marking pat-the-post + find-nothing solves', () => {
    const { store, host } = render('world.round-path');
    const buttons = [...host.querySelectorAll('.mechanic-body button')].filter((b) => /pat the post|find nothing/.test(b.textContent ?? ''));
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    click('Break the loop', host);
    expect(store.getState().completedMechanics).toContain('mechanic.round-path');
  });
});

describe('gate', () => {
  test('wrong order misreads cases, lantern order seals', () => {
    const { store, host } = render('world.gate-of-orders');
    click(/turn away pilgrims/, host);
    click('Seal the order', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.gate-of-orders');
    click(/carrying a lantern/, host);
    click('Seal the order', host);
    expect(store.getState().completedMechanics).toContain('mechanic.gate-of-orders');
  });
});

describe('assayer', () => {
  test('vanity check proves nothing, assay + cracked weight solves', () => {
    const { store, host } = render('world.assayers-scale');
    click(/gleaming scale/, host);
    click(/cracked weight/, host);
    click('Weigh the evidence', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.assayers-scale');
    click(/weighed against a known good/, host);
    click('Weigh the evidence', host);
    expect(store.getState().completedMechanics).toContain('mechanic.assayers-scale');
  });
});

describe('blueprint', () => {
  test('vague clause waits, exact measurements build', () => {
    const { store, host } = render('world.blueprint-and-mason');
    click(/sturdy enough/, host);
    click(/60 bricks wide/, host);
    click(/20 bricks high/, host);
    click('Ask the Mason to build', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.blueprint');
    click(/sturdy enough/, host);
    click('Ask the Mason to build', host);
    expect(store.getState().completedMechanics).toContain('mechanic.blueprint');
  });
});

describe('well', () => {
  test('leaking private work fails, correct routing seals the day', () => {
    const { store, host } = render('world.well-and-pipe');
    select('Route: drinking water', 'pipe', host);
    select('Route: bathing water', 'well', host);
    select('Route: laundry', 'pipe', host);
    select('Route: watering the garden', 'pipe', host);
    click('Seal the day', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.well-and-pipe');
    select('Route: drinking water', 'well', host);
    click('Seal the day', host);
    expect(store.getState().completedMechanics).toContain('mechanic.well-and-pipe');
  });
});

describe('garden', () => {
  test('needs a wander, a name and a seed before planting', () => {
    const { store, host } = render('world.commons-garden');
    click('Plant your Bead', host);
    expect(store.getState().completedMechanics).not.toContain('mechanic.commons-garden');
    click(/Wander The Fog Alphabet/, host);
    (host.querySelector('input[aria-label="Name your Bead"]') as HTMLInputElement).value = 'The Patient Cup';
    click('Attention', host);
    click('Plant your Bead', host);
    expect(store.getState().completedMechanics).toContain('mechanic.commons-garden');
    expect(store.getState().achievements).toContain('achievement.planted');
  });
});

describe('shell', () => {
  test('every world renders intro, dialogue, mechanic and concepts', async () => {
    const { renderWorld } = await import('../src/views/world');
    for (const world of Object.values(content.worlds)) {
      const { store, ctx } = setup();
      const host = document.createElement('div');
      renderWorld(host, ctx, store, world.id);
      expect(host.querySelector('h1')?.textContent, world.id).toBe(world.title);
      expect(host.querySelector('.mechanic'), world.id).not.toBeNull();
      expect(host.querySelectorAll('.concepts details').length, world.id).toBe(world.concepts.length);
    }
  });

  test('thread mode offers the next bead; wander mode only goes home', async () => {
    const { renderWorld } = await import('../src/views/world');
    const { threadSequence } = await import('../src/thread');
    const seq = threadSequence(content);
    const { store, ctx } = setup();
    const host = document.createElement('div');
    renderWorld(host, ctx, store, seq[0]);
    const next = [...host.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Continue the Thread'));
    expect(next?.textContent).toContain(content.worlds[seq[1]].title);
    next?.dispatchEvent(new MouseEvent('click'));

    const { store: wanderStore, ctx: wanderCtx } = setup();
    wanderStore.dispatch({ type: 'mode.changed', mode: 'wander' });
    const wanderHost = document.createElement('div');
    renderWorld(wanderHost, wanderCtx, wanderStore, seq[0]);
    expect([...wanderHost.querySelectorAll('button')].some((b) => b.textContent?.startsWith('Continue the Thread'))).toBe(false);
  });

  test('garden remembers the planted name after a fresh render', async () => {
    const { renderWorld } = await import('../src/views/world');
    const garden = Object.values(content.worlds).find((w) => w.mechanic === 'mechanic.commons-garden')!;
    const { store, ctx } = setup();
    const host = document.createElement('div');
    document.body.appendChild(host);
    renderWorld(host, ctx, store, garden.id);
    (host.querySelector('input[aria-label="Name your Bead"]') as HTMLInputElement).value = 'The Patient Cup';
    click(/Wander /, host);
    click('Attention', host);
    click('Plant your Bead', host);
    const again = document.createElement('div');
    renderWorld(again, ctx, store, garden.id);
    expect(again.querySelector('.mechanic-body .solved')?.textContent).toContain('The Patient Cup');
  });
});
