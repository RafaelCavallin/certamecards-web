import type { ReviewPushResult } from '../api/sync.model';
import type { OutboxItem } from '../db/local-db.model';
import { outboxItemCardId } from './outbox-item';

interface SettlementContext {
  readonly staleCardIds: ReadonlySet<string>;
  readonly acceptedReviewIds: ReadonlySet<string>;
  readonly rejectedReviewIds: ReadonlySet<string>;
  readonly acceptedVoidIds: ReadonlySet<string>;
  readonly resolvedStateCardIds: ReadonlySet<string>;
}
export function seqsToRemove(items: readonly OutboxItem[], result: ReviewPushResult): readonly number[] {
  const context = buildContext(result);
  return items
    .filter((item) => shouldRemove(item, context))
    .map((item) => item.seq)
    .filter((seq): seq is number => seq !== undefined);
}
function buildContext(result: ReviewPushResult): SettlementContext {
  return {
    staleCardIds: new Set(result.staleStates.map((state) => state.cardId)),
    acceptedReviewIds: new Set(result.acceptedReviewIds),
    rejectedReviewIds: new Set(result.rejectedReviews.map((rejected) => rejected.id)),
    acceptedVoidIds: new Set(result.acceptedVoids),
    resolvedStateCardIds: new Set([
      ...result.appliedStates.map((state) => state.cardId),
      ...result.ignoredStates.map((state) => state.cardId),
    ]),
  };
}
function shouldRemove(item: OutboxItem, context: SettlementContext): boolean {
  if (context.staleCardIds.has(outboxItemCardId(item))) {
    return false;
  }
  if (item.kind === 'review') {
    return context.acceptedReviewIds.has(item.log.id) || context.rejectedReviewIds.has(item.log.id);
  }
  if (item.kind === 'void') {
    return context.acceptedVoidIds.has(item.reviewId);
  }
  return context.resolvedStateCardIds.has(item.cardId);
}
