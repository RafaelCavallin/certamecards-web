import type { ReviewOutboxItem } from '../db/account-db.model';

export function reviewOutboxItemCardId(item: ReviewOutboxItem): string {
  return item.kind === 'review' ? item.log.cardId : item.cardId;
}
