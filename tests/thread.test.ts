import { describe, it, expect } from 'vitest';
import { content } from '../src/content/content';
import { threadSequence, nextUnvisited, neighbourInSequence } from '../src/thread';

describe('thread helper', () => {
  it('reads the authored sequence', () => {
    const seq = threadSequence(content);
    expect(seq[0]).toBe('world.lantern-room');
    expect(seq.length).toBe(10);
  });
  it('finds the next unvisited Bead', () => {
    const seq = ['a', 'b', 'c'];
    expect(nextUnvisited(seq, [])).toBe('a');
    expect(nextUnvisited(seq, ['a', 'b'])).toBe('c');
    expect(nextUnvisited(seq, ['a'])).toBe('b');
  });
  it('has no next when the Thread is walked', () => {
    expect(nextUnvisited(['a', 'b'], ['a', 'b'])).toBeUndefined();
    expect(nextUnvisited([], [])).toBeUndefined();
  });
  it('finds the neighbour in sequence, and none at the end or off the path', () => {
    const seq = ['a', 'b', 'c'];
    expect(neighbourInSequence(seq, 'a')).toBe('b');
    expect(neighbourInSequence(seq, 'c')).toBeUndefined();
    expect(neighbourInSequence(seq, 'z')).toBeUndefined();
  });
});