import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import type { UserSettings } from '../api/settings.model';

export interface DeckWritePayload {
  readonly kind: 'deck_create' | 'deck_update';
  readonly deck: Deck;
}
export interface DeckDeletePayload {
  readonly kind: 'deck_delete';
  readonly deckId: string;
}
export interface CardWritePayload {
  readonly kind: 'card_create' | 'card_update';
  readonly card: Card;
}
export interface CardDeletePayload {
  readonly kind: 'card_delete';
  readonly cardId: string;
}
export interface CardSuspensionPayload {
  readonly kind: 'card_suspension';
  readonly cardId: string;
  readonly suspended: boolean;
}
export interface DeckResetPayload {
  readonly kind: 'deck_reset';
  readonly deckId: string;
}
export interface SettingsPatchPayload {
  readonly kind: 'settings_patch';
  readonly changes: Partial<UserSettings>;
}
export interface ProfilePatchPayload {
  readonly kind: 'profile_patch';
  readonly displayName: string;
}
export interface ConflictRestorePayload {
  readonly kind: 'conflict_restore';
  readonly conflictId: string;
  readonly snapshot: unknown;
  readonly targetDeckId: string | null;
}
export type SyncOperationPayload =
  | DeckWritePayload
  | DeckDeletePayload
  | CardWritePayload
  | CardDeletePayload
  | CardSuspensionPayload
  | DeckResetPayload
  | SettingsPatchPayload
  | ProfilePatchPayload
  | ConflictRestorePayload;
