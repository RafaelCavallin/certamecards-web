import type { ReviewPushResult } from '../api/sync.model';
import type { ReviewOutboxItem } from '../db/account-db.model';
import { reviewOutboxItemCardId } from './review-outbox-item';

interface SettlementContext {
  readonly staleCardIds: ReadonlySet<string>;
  readonly acceptedReviewIds: ReadonlySet<string>;
  readonly rejectedReviewIds: ReadonlySet<string>;
  readonly acceptedVoidIds: ReadonlySet<string>;
  readonly resolvedStateCardIds: ReadonlySet<string>;
}
export interface SettlementPlan {
  readonly removeSeqs: readonly number[];
  readonly rejectSeqs: readonly number[];
}
type ItemOutcome = 'keep' | 'remove' | 'reject';
function buildContext(result: ReviewPushResult): SettlementContext {
  return {
    staleCardIds: new Set(result.staleStates.map((state) => state.cardId)),
    acceptedReviewIds: new Set(result.acceptedReviews.map((accepted) => accepted.id)),
    rejectedReviewIds: new Set(result.rejectedReviews.map((rejected) => rejected.id)),
    acceptedVoidIds: new Set(result.acceptedVoids),
    resolvedStateCardIds: new Set([
      ...result.appliedStates.map((state) => state.cardId),
      ...result.ignoredStates.map((state) => state.cardId),
    ]),
  };
}
function classifyReview(item: Extract<ReviewOutboxItem, { kind: 'review' }>, context: SettlementContext): ItemOutcome {
  if (context.acceptedReviewIds.has(item.log.id)) {
    return 'remove';
  }
  if (context.rejectedReviewIds.has(item.log.id)) {
    return 'reject';
  }
  return 'keep';
}
function classify(item: ReviewOutboxItem, context: SettlementContext): ItemOutcome {
  if (context.staleCardIds.has(reviewOutboxItemCardId(item))) {
    return 'keep';
  }
  if (item.kind === 'review') {
    return classifyReview(item, context);
  }
  if (item.kind === 'void') {
    return context.acceptedVoidIds.has(item.reviewId) ? 'remove' : 'keep';
  }
  return context.resolvedStateCardIds.has(item.cardId) ? 'remove' : 'keep';
}
export function planSettlement(items: readonly ReviewOutboxItem[], result: ReviewPushResult): SettlementPlan {
  const context = buildContext(result);
  const removeSeqs: number[] = [];
  const rejectSeqs: number[] = [];
  for (const item of items) {
    const outcome = classify(item, context);
    if (outcome === 'remove' && item.seq !== undefined) {
      removeSeqs.push(item.seq);
    }
    if (outcome === 'reject' && item.seq !== undefined) {
      rejectSeqs.push(item.seq);
    }
  }
  return { removeSeqs, rejectSeqs };
}
