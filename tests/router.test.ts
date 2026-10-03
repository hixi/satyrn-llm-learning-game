import { describe, it, expect } from 'vitest';
import { parseHash, routeToHash } from '../src/router';

describe('router', () => {
  it('parses the empty hash as the map', () => {
    expect(parseHash('')).toEqual({ name: 'map' });
    expect(parseHash('#/')).toEqual({ name: 'map' });
  });
  it('lands legacy thread and concept links on the map and journal', () => {
    expect(parseHash('#/thread')).toEqual({ name: 'map' });
    expect(parseHash('#/world/world.lantern-room')).toEqual({ name: 'world', worldId: 'world.lantern-room' });
    expect(parseHash('#/concept/concept.tokens')).toEqual({ name: 'notFound', path: 'concept/concept.tokens' });
  });
  it('returns notFound for an unknown top-level path', () => {
    expect(parseHash('#/nonsense')).toEqual({ name: 'notFound', path: 'nonsense' });
  });
  it('round-trips every known route', () => {
    for (const r of [
      { name: 'map' } as const,
      { name: 'journal' } as const,
      { name: 'world', worldId: 'world.x' } as const,
    ]) {
      expect(parseHash(routeToHash(r))).toEqual(r);
    }
  });
});
