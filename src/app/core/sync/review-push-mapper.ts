import type { CardState } from '../api/card-state.model';
import type { ReviewLog } from '../api/review-log.model';
import type { CardStatePush, ReviewLogPush, ReviewPushRequest, ReviewVoidPush } from '../api/sync.model';
import type { ReviewOutboxItem, ReviewOutboxReviewItem, ReviewOutboxVoidItem } from '../db/account-db.model';

function isReviewItem(item: ReviewOutboxItem): item is ReviewOutboxReviewItem {
  return item.kind === 'review';
}
function isVoidItem(item: ReviewOutboxItem): item is ReviewOutboxVoidItem {
  return item.kind === 'void';
}
function reviewLogFields(log: ReviewLog): Omit<ReviewLog, 'changeSeq'> {
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
function toReviewLogPushes(items: readonly ReviewOutboxReviewItem[]): ReviewLogPush[] {
  return items.map((item) => ({
    ...reviewLogFields(item.log),
    clock: { wallTime: item.log.eventAt, logicalCounter: item.log.eventCounter },
    observedServerTime: item.observedServerTime,
  }));
}
function toReviewVoidPush(item: ReviewOutboxVoidItem): ReviewVoidPush {
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
function itemState(item: ReviewOutboxItem): { readonly cardId: string; readonly state: CardState } | null {
  if (item.kind === 'review') {
    return { cardId: item.log.cardId, state: item.state };
  }
  if (item.state === null) {
    return null;
  }
  return { cardId: item.cardId, state: item.state };
}
function latestStatesByCard(items: readonly ReviewOutboxItem[]): readonly CardStatePush[] {
  const byCard = new Map<string, CardState>();
  for (const item of items) {
    const entry = itemState(item);
    if (entry !== null) {
      byCard.set(entry.cardId, entry.state);
    }
  }
  return Array.from(byCard.values()).map(toCardStatePush);
}
export function buildReviewPushRequest(deviceId: string, items: readonly ReviewOutboxItem[]): ReviewPushRequest {
  const reviews = toReviewLogPushes(items.filter(isReviewItem));
  const voids = items.filter(isVoidItem).map(toReviewVoidPush);
  const states = latestStatesByCard(items);
  return { deviceId, reviews, voids, states };
}
