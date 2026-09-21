import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { SessionRuntime } from './study-session-runtime';
import type { CurrentCard } from './study-session.model';

const MIN_CORRECT_RATING = 3;
export interface RatingOutcomeInput {
  readonly runtime: SessionRuntime;
  readonly current: CurrentCard;
  readonly newState: CardState;
  readonly rating: number;
}
export function applyRatingOutcome(input: RatingOutcomeInput): void {
  const { runtime, current, newState, rating } = input;
  runtime.statesById.set(current.ref.cardId, newState);
  runtime.reviewed += 1;
  runtime.seenCardIds.add(current.ref.cardId);
  if (rating >= MIN_CORRECT_RATING) {
    runtime.correct += 1;
  }
  const dueAgainToday = newState.state !== CARD_STATE_REVIEW && new Date(newState.due).getTime() <= runtime.day.end.getTime();
  if (dueAgainToday) {
    runtime.queue.learning.push({ card: current.ref, due: new Date(newState.due) });
    return;
  }
  runtime.done += 1;
}
export function sessionTotal(runtime: SessionRuntime, hasCurrent: boolean): number {
  const remaining = runtime.queue.main.length + runtime.queue.learning.length + (hasCurrent ? 1 : 0);
  return runtime.done + remaining;
}
