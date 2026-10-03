import type { Content } from './content/types';

export function threadSequence(content: Content): string[] {
  return content.threads['thread.main']?.sequence ?? [];
}

export function nextUnvisited(sequence: string[], visited: string[]): string | undefined {
  const seen = new Set(visited);
  return sequence.find((id) => !seen.has(id));
}

/** The Bead after `worldId` in the sequence, or undefined at the end or off the path. */
export function neighbourInSequence(sequence: string[], worldId: string): string | undefined {
  const index = sequence.indexOf(worldId);
  if (index === -1) return undefined;
  return sequence[index + 1];
}