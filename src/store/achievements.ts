import type { Achievement, Condition } from '../content/types';
import type { GameState, StoreEvent } from './state';
import type { Predicate } from './store';

/**
 * A leaf matches when the current event is that event (with its world/mechanic
 * filter), or when the state already records it. That lets one function serve
 * both achievement evaluation and dialogue gating.
 */
export function matchesCondition(state: GameState, event: StoreEvent, condition: Condition): boolean {
  if ('all' in condition) return condition.all.every((c) => matchesCondition(state, event, c));
  if ('any' in condition) return condition.any.some((c) => matchesCondition(state, event, c));
  if ('not' in condition) return !matchesCondition(state, event, condition.not);

  switch (condition.event) {
    case 'world.entered':
      return (
        (event.type === 'world.entered' && (!condition.world || event.world === condition.world)) ||
        (!!condition.world && state.visitedWorlds.includes(condition.world))
      );
    case 'world.skipped':
      return (
        (event.type === 'world.skipped' && (!condition.world || event.world === condition.world)) ||
        (!!condition.world && state.skippedWorlds.includes(condition.world))
      );
    case 'world.engineRoom.completed':
      return (
        (event.type === 'world.engineRoom.completed' && (!condition.world || event.world === condition.world)) ||
        (!!condition.world && state.completedEngineRooms.includes(condition.world))
      );
    case 'mechanic.completed': {
      const matchesEvent =
        event.type === 'mechanic.completed' &&
        (!condition.mechanic || event.mechanic === condition.mechanic) &&
        (!condition.world || event.world === condition.world);
      const matchesState =
        !!condition.mechanic &&
        (!condition.world || state.visitedWorlds.includes(condition.world)) &&
        state.completedMechanics.includes(condition.mechanic);
      return matchesEvent || matchesState;
    }
    case 'evidence.submitted':
      return (
        (event.type === 'evidence.submitted' && (!condition.mechanic || event.mechanic === condition.mechanic)) ||
        (!!condition.mechanic && condition.mechanic in state.evidence)
      );
  }
}

export function evaluateAchievements(
  state: GameState,
  event: StoreEvent,
  achievements: Achievement[],
  predicates: Record<string, Predicate> = {},
): string[] {
  const earned: string[] = [];
  for (const achievement of achievements) {
    if (state.achievements.includes(achievement.id)) continue;
    const matched = achievement.predicate
      ? (predicates[achievement.predicate]?.(state, event) ?? false)
      : achievement.condition
        ? matchesCondition(state, event, achievement.condition)
        : false;
    if (matched) earned.push(achievement.id);
  }
  return earned;
}