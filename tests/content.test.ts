import { describe, expect, test } from 'vitest';
import { content } from '../src/content/content';
import { SCENARIO_VALIDATORS } from '../src/game/worlds/scenarios';
import { starsForMistakes } from '../src/game/worlds/logic-contract';

describe('frozen content bundle', () => {
  test('thread holds all ten beads in order', () => {
    const seq = content.threads['thread.main']?.sequence ?? [];
    expect(seq).toEqual([
      'world.lantern-room',
      'world.rain-gauge-terrace',
      'world.aviary-of-whispers',
      'world.cartwrights-yard',
      'world.round-path',
      'world.gate-of-orders',
      'world.assayers-scale',
      'world.blueprint-and-mason',
      'world.well-and-pipe',
      'world.commons-garden',
    ]);
  });

  test('every world points at a known mechanic, keeper, dialogue and concepts', () => {
    for (const world of Object.values(content.worlds)) {
      expect(content.mechanics[world.mechanic], `${world.id} mechanic`).toBeDefined();
      if (world.keeper) expect(content.characters[world.keeper], `${world.id} keeper`).toBeDefined();
      if (world.dialogue) expect(content.dialogues[world.dialogue], `${world.id} dialogue`).toBeDefined();
      for (const c of world.concepts) expect(content.concepts[c], `${world.id} concept ${c}`).toBeDefined();
    }
  });

  test('every achievement condition names a real mechanic or world', () => {
    const mechanics = new Set(Object.keys(content.mechanics));
    const worlds = new Set(Object.keys(content.worlds));
    const check = (c: unknown): void => {
      if (!c || typeof c !== 'object') return;
      const r = c as Record<string, unknown>;
      if ('all' in r && Array.isArray(r.all)) return r.all.forEach(check);
      if ('any' in r && Array.isArray(r.any)) return r.any.forEach(check);
      if ('not' in r) return check(r.not);
      if (typeof r.mechanic === 'string') expect(mechanics.has(r.mechanic), `mechanic ${r.mechanic}`).toBe(true);
      if (typeof r.world === 'string') expect(worlds.has(r.world), `world ${r.world}`).toBe(true);
    };
    for (const a of Object.values(content.achievements)) check(a.condition);
  });

  test('every dialogue node names a real character and reachable nodes', () => {
    for (const d of Object.values(content.dialogues)) {
      expect(d.nodes[d.start], `${d.id} start`).toBeDefined();
      for (const node of Object.values(d.nodes)) {
        expect(content.characters[node.speaker], `${d.id}.${node.id} speaker`).toBeDefined();
        for (const choice of node.choices) {
          if (choice.next) expect(d.nodes[choice.next], `${d.id}.${node.id} next ${choice.next}`).toBeDefined();
        }
      }
    }
  });
});

describe('scenario validators', () => {
  test('has a validator for every content mechanic that carries params', () => {
    for (const mechanic of Object.values(content.mechanics)) {
      if (Object.keys(mechanic.params).length > 0) {
        expect(SCENARIO_VALIDATORS[mechanic.id], mechanic.id).toBeTypeOf('function');
      }
    }
  });

  test('accepts every authored scenario', () => {
    for (const mechanic of Object.values(content.mechanics)) {
      const validator = SCENARIO_VALIDATORS[mechanic.id];
      if (validator) expect(validator(mechanic.params), mechanic.id).toEqual([]);
    }
  });

  test('accepts the defaults when params carry only stars', () => {
    for (const [id, validator] of Object.entries(SCENARIO_VALIDATORS)) {
      if (id === 'mechanic.commons-garden') {
        expect(validator({}), id).toEqual([]);
      } else {
        expect(validator({ stars: { three: 0, two: 2 } }), id).toEqual([]);
      }
    }
  });

  test('rain-gauge: essentials exceed the cup', () => {
    const problems = SCENARIO_VALIDATORS['mechanic.rain-gauge']({
      capacity: 1,
      drops: [
        { id: 'a', essential: true },
        { id: 'b', essential: true },
      ],
      stars: { three: 0, two: 2 },
    });
    expect(problems.some((p) => /unsolvable/.test(p))).toBe(true);
  });

  test('gate: two orders pass, so the puzzle is ambiguous', () => {
    const problems = SCENARIO_VALIDATORS['mechanic.gate-of-orders']({
      travellers: [{ id: 't', label: 't', attributes: ['lantern'], shouldEnter: true }],
      orders: [
        { id: 'o1', text: 'lantern', allow: ['lantern'], deny: [] },
        { id: 'o2', text: 'everyone', allow: [], deny: [] },
      ],
      stars: { three: 0, two: 2 },
    });
    expect(problems.some((p) => /ambiguous/.test(p))).toBe(true);
  });

  test('stars map mistakes to 3/2/1 at the thresholds', () => {
    const bands = { three: 0, two: 2 };
    expect(starsForMistakes(0, bands)).toBe(3);
    expect(starsForMistakes(2, bands)).toBe(2);
    expect(starsForMistakes(5, bands)).toBe(1);
  });
});
