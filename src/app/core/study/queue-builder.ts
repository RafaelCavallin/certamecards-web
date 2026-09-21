import { CARD_STATE_NEW, CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import { AHEAD_OF_SCHEDULE_WINDOW_MINUTES, REVIEWS_PER_NEW_CARD } from './study-constants';
import type { NextCardResult, QueueInput, QueueRef, QueueScope, QueueState, StudyCard, StudyDayWindow } from './queue.model';

const MINUTE_MS = 60_000;
interface Buckets {
  readonly reviews: QueueRef[];
  readonly learning: QueueRef[];
  readonly fresh: QueueRef[];
}
function matchesScope(card: StudyCard, scope: QueueScope): boolean {
  if (scope.kind === 'deck') {
    return card.deckId === scope.deckId;
  }
  if (scope.kind === 'subject') {
    return card.subjectId === scope.subjectId;
  }
  return true;
}
function isEligible(card: StudyCard, input: QueueInput): boolean {
  const state = input.states.get(card.cardId);
  return matchesScope(card, input.scope) && (!state?.suspended);
}
interface CardWithState {
  readonly card: StudyCard;
  readonly state: CardState | undefined;
}
function classify(entry: CardWithState, day: StudyDayWindow, buckets: Buckets): void {
  const { card, state } = entry;
  if (state === undefined || state.state === CARD_STATE_NEW) {
    buckets.fresh.push({ card, due: day.start });
    return;
  }
  const due = new Date(state.due);
  if (due.getTime() > day.end.getTime()) {
    return;
  }
  const target = state.state === CARD_STATE_REVIEW ? buckets.reviews : buckets.learning;
  target.push({ card, due });
}
function sortByDue(refs: readonly QueueRef[]): QueueRef[] {
  return [...refs].sort((a, b) => a.due.getTime() - b.due.getTime());
}
function interleave(reviews: readonly QueueRef[], fresh: readonly QueueRef[]): QueueRef[] {
  const main: QueueRef[] = [];
  const remainingReviews = [...reviews];
  const remainingFresh = [...fresh];
  while (remainingReviews.length > 0 || remainingFresh.length > 0) {
    main.push(...remainingReviews.splice(0, REVIEWS_PER_NEW_CARD));
    const nextFresh = remainingFresh.shift();
    if (nextFresh !== undefined) {
      main.push(nextFresh);
    }
  }
  return main;
}
export function buildQueue(input: QueueInput, day: StudyDayWindow): QueueState {
  const buckets: Buckets = { reviews: [], learning: [], fresh: [] };
  for (const card of input.cards.filter((candidate) => isEligible(candidate, input))) {
    classify({ card, state: input.states.get(card.cardId) }, day, buckets);
  }
  const reviews = sortByDue(buckets.reviews).slice(0, Math.max(0, input.reviewLimit));
  const fresh = buckets.fresh.slice(0, Math.max(0, input.newLimit));
  return { main: interleave(reviews, fresh), learning: sortByDue(buckets.learning) };
}
export function nextCard(queue: QueueState, now: Date): NextCardResult {
  queue.learning.sort((a, b) => a.due.getTime() - b.due.getTime());
  const dueLearning = queue.learning[0];
  if (dueLearning !== undefined && dueLearning.due.getTime() <= now.getTime()) {
    queue.learning.shift();
    return { card: dueLearning.card, nextAvailableAt: null };
  }
  const mainRef = queue.main.shift();
  if (mainRef !== undefined) {
    return { card: mainRef.card, nextAvailableAt: null };
  }
  const aheadWindowMs = AHEAD_OF_SCHEDULE_WINDOW_MINUTES * MINUTE_MS;
  if (dueLearning !== undefined && dueLearning.due.getTime() - now.getTime() <= aheadWindowMs) {
    queue.learning.shift();
    return { card: dueLearning.card, nextAvailableAt: null };
  }
  return { card: null, nextAvailableAt: dueLearning?.due ?? null };
}
