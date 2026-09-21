import type { UserRole } from '../api/auth.model';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { ProductEvent } from '../events/event.model';
import type { ReviewLog } from '../api/review-log.model';
import type { UserSettings } from '../api/settings.model';

export interface StoredSession {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly termsAccepted: boolean;
}
export interface MetaSchema {
  readonly session: StoredSession;
  readonly deviceId: string;
  readonly cursor: number;
  readonly lastSyncAt: string;
}
export interface MetaRow<K extends keyof MetaSchema = keyof MetaSchema> {
  readonly key: K;
  readonly value: MetaSchema[K];
}
export interface CardRow extends Card {
  readonly searchText: string;
}
export interface ReviewLogRow extends ReviewLog {
  readonly voided: boolean;
}
export interface SettingsRow extends UserSettings {
  readonly userId: string;
}
export type EventRow = ProductEvent;
export interface OutboxReviewItem {
  readonly seq?: number;
  readonly kind: 'review';
  readonly log: ReviewLog;
  readonly state: CardState;
}
export interface OutboxVoidItem {
  readonly seq?: number;
  readonly kind: 'void';
  readonly reviewId: string;
  readonly voidedAt: string;
  readonly cardId: string;
  readonly state: CardState | null;
}
export interface OutboxStateItem {
  readonly seq?: number;
  readonly kind: 'state';
  readonly cardId: string;
  readonly state: CardState;
}
export type OutboxItem = OutboxReviewItem | OutboxVoidItem | OutboxStateItem;
export function isStoredSession(value: unknown): value is StoredSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    'userId' in value &&
    'email' in value &&
    'displayName' in value &&
    'role' in value &&
    'termsAccepted' in value &&
    typeof value.userId === 'string' &&
    typeof value.email === 'string' &&
    typeof value.displayName === 'string' &&
    (value.role === 'candidate' || value.role === 'admin') &&
    typeof value.termsAccepted === 'boolean'
  );
}
export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
