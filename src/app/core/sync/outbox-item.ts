import type { OutboxItem } from '../db/local-db.model';

export function outboxItemCardId(item: OutboxItem): string {
  return item.kind === 'review' ? item.log.cardId : item.cardId;
}
