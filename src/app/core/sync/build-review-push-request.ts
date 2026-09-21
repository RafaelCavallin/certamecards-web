import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import type { CardStatePush, ReviewLogPush, ReviewPushRequest, ReviewVoidPush } from '../api/sync.model';
import type { OutboxItem } from '../db/local-db.model';

export function buildReviewPushRequest(deviceId: string, items: readonly OutboxItem[]): ReviewPushRequest {
  const reviews = items.filter(isReviewItem).map((item) => toReviewLogPush(item.log));
  const voids = items.filter(isVoidItem).map((item) => toReviewVoidPush(item));
  const states = latestStatesByCard(items);
  return { deviceId, reviews, voids, states };
}
function isReviewItem(item: OutboxItem): item is Extract<OutboxItem, { kind: 'review' }> {
  return item.kind === 'review';
}
function isVoidItem(item: OutboxItem): item is Extract<OutboxItem, { kind: 'void' }> {
  return item.kind === 'void';
}
function toReviewLogPush(log: ReviewLog): ReviewLogPush {
  return {
    id: log.id,
    cardId: log.cardId,
    kind: log.kind,
    rating: log.rating,
    reviewedAt: log.reviewedAt,
    durationMs: log.durationMs,
    stateBefore: log.stateBefore,
    stateAfter: log.stateAfter,
    offline: log.offline,
    deviceId: log.deviceId,
    sessionId: log.sessionId,
  };
}
function toReviewVoidPush(item: Extract<OutboxItem, { kind: 'void' }>): ReviewVoidPush {
  return { reviewId: item.reviewId, voidedAt: item.voidedAt };
}
function toCardStatePush(state: CardState): CardStatePush {
  return {
    cardId: state.cardId,
    state: state.state,
    stability: state.stability,
    difficulty: state.difficulty,
    due: state.due,
    lastReview: state.lastReview,
    reps: state.reps,
    lapses: state.lapses,
    learningSteps: state.learningSteps,
    scheduledDays: state.scheduledDays,
    reviewCount: state.reviewCount,
  };
}
function itemState(item: OutboxItem): { readonly cardId: string; readonly state: CardState } | null {
  if (item.kind === 'review') {
    return { cardId: item.log.cardId, state: item.state };
  }
  if (item.state === null) {
    return null;
  }
  return { cardId: item.cardId, state: item.state };
}
function latestStatesByCard(items: readonly OutboxItem[]): readonly CardStatePush[] {
  const byCard = new Map<string, CardState>();
  for (const item of items) {
    const entry = itemState(item);
    if (entry !== null) {
      byCard.set(entry.cardId, entry.state);
    }
  }
  return Array.from(byCard.values()).map(toCardStatePush);
}
