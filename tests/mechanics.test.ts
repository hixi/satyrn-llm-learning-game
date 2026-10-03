import { describe, expect, test } from 'vitest';
import { Store } from '../src/store/store';
import { content } from '../src/content/content';
import { completeMechanic } from '../src/ui/mechanic-helpers';

function testStore(): Store {
  return new Store({ storage: null, achievements: Object.values(content.achievements) });
}

const silent = { success() {}, fail() {}, click() {} };

describe('mechanic completion contract', () => {
  test('completing a mechanic awards stars, concepts and the lesson honor', () => {
    const store = testStore();
    const ctx = { store, sounds: silent };
    completeMechanic(ctx, 'mechanic.rain-gauge', 'world.rain-gauge-terrace', 0, { usedFallback: false });
    const s = store.getState();
    expect(s.completedMechanics).toContain('mechanic.rain-gauge');
    expect(s.stars['world.rain-gauge-terrace']).toBe(3);
    expect(s.earnedConcepts).toContain('concept.tokens');
    expect(s.achievements).toContain('achievement.steady-hand');
    expect(s.evidence['mechanic.rain-gauge']).toBeDefined();
  });

  test('mistakes lower the stars; skipping records an honest skip', () => {
    const store = testStore();
    const ctx = { store, sounds: silent };
    completeMechanic(ctx, 'mechanic.aviary', 'world.aviary-of-whispers', 5, { usedFallback: false });
    expect(store.getState().stars['world.aviary-of-whispers']).toBe(1);
    store.dispatch({ type: 'world.skipped', world: 'world.aviary-of-whispers' });
    expect(store.getState().skippedWorlds).toContain('world.aviary-of-whispers');
    expect(store.getState().achievements).toContain('achievement.wanderer');
  });

  test('all ten mechanics complete against their authored params', () => {
    const worlds = Object.values(content.worlds);
    expect(worlds.length).toBe(10);
    for (const world of worlds) {
      const store = testStore();
      const ctx = { store, sounds: silent };
      completeMechanic(ctx, world.mechanic, world.id, 0, { usedFallback: false });
      expect(store.getState().completedMechanics, world.id).toContain(world.mechanic);
    }
  });
});
