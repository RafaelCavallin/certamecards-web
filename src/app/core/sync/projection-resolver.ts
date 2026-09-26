import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import type { DeckSubscription } from '../api/library.model';
import type { UserSettings } from '../api/settings.model';
import type {
  CardChangePayload, CardStateChangePayload, ChangeEntry, ConflictChangePayload, DeckChangePayload,
  ProfileChangePayload, ReviewLogChangePayload, ReviewVoidChangePayload, SettingsChangePayload,
  SubjectChangePayload, SubscriptionChangePayload,
} from '../api/sync.model';
import type { AccountDb } from '../db/account-db';
import type { ReviewLogRow } from '../db/account-db.model';
import { toCardRow } from '../db/card-row';
import { CARD_WRITE_KINDS, DECK_WRITE_KINDS } from './operation-compactor';
import { discardRemoteBase, stashRemoteBase } from './remote-base';
import { pendingSettingsOverlay } from './settings-overlay';
import type { SyncOperationKind } from './sync-operation.model';

async function hasUnresolvedOperation(db: AccountDb, entityId: string, kinds: readonly SyncOperationKind[]): Promise<boolean> {
  const count = await db.syncOperations
    .where('entityId')
    .equals(entityId)
    .filter((operation) => kinds.includes(operation.kind) && operation.status !== 'synced')
    .count();
  return count > 0;
}
async function applyDeck(db: AccountDb, payload: DeckChangePayload, changeSeq: number): Promise<void> {
  if (await hasUnresolvedOperation(db, payload.id, DECK_WRITE_KINDS)) {
    await stashRemoteBase(db, { entityId: payload.id, entityType: 'deck', changeSeq, payload });
    return;
  }
  const deck: Deck = { ...payload, changeSeq };
  await db.decks.put(deck);
  await discardRemoteBase(db, payload.id);
}
async function applyCard(db: AccountDb, payload: CardChangePayload, changeSeq: number): Promise<void> {
  if (await hasUnresolvedOperation(db, payload.id, CARD_WRITE_KINDS)) {
    await stashRemoteBase(db, { entityId: payload.id, entityType: 'card', changeSeq, payload });
    return;
  }
  const card: Card = { ...payload, changeSeq };
  await db.cards.put(toCardRow(card));
  await discardRemoteBase(db, payload.id);
}
async function hasPendingDeckReset(db: AccountDb, cardId: string): Promise<boolean> {
  const card = await db.cards.get(cardId);
  if (card === undefined) {
    return false;
  }
  return hasUnresolvedOperation(db, card.deckId, ['deck_reset']);
}
async function applyCardState(db: AccountDb, payload: CardStateChangePayload, changeSeq: number): Promise<void> {
  if (await hasUnresolvedOperation(db, payload.cardId, ['card_suspension'])) {
    return;
  }
  if (await hasPendingDeckReset(db, payload.cardId)) {
    return;
  }
  const state: CardState = { ...payload, changeSeq };
  await db.cardStates.put(state);
}
async function applySubject(db: AccountDb, payload: SubjectChangePayload, changeSeq: number): Promise<void> {
  await db.subjects.put({ ...payload, changeSeq });
}
export async function removeUnsubscribedDeck(db: AccountDb, deckId: string): Promise<void> {
  if (await hasUnresolvedOperation(db, deckId, DECK_WRITE_KINDS)) {
    return;
  }
  const cardIds = await db.cards.where('deckId').equals(deckId).primaryKeys();
  await db.cardStates.bulkDelete(cardIds);
  await db.cards.bulkDelete(cardIds);
  await db.decks.delete(deckId);
}
async function applySubscription(db: AccountDb, payload: SubscriptionChangePayload, changeSeq: number): Promise<void> {
  const subscription: DeckSubscription = { ...payload, changeSeq };
  await db.subscriptions.put(subscription);
  if (subscription.cancelledAt !== null) {
    await removeUnsubscribedDeck(db, subscription.deckId);
  }
}
async function clearResetMarkerIfPresent(db: AccountDb, payload: ReviewLogChangePayload): Promise<void> {
  if (payload.kind !== 'reset') {
    return;
  }
  const card = await db.cards.get(payload.cardId);
  if (card === undefined) {
    return;
  }
  const markers = await db.deckResets.where('deckId').equals(card.deckId).primaryKeys();
  await db.deckResets.bulkDelete(markers);
}
async function applyReviewLog(db: AccountDb, payload: ReviewLogChangePayload, changeSeq: number): Promise<void> {
  const row: ReviewLogRow = {
    id: payload.id, cardId: payload.cardId, kind: payload.kind, rating: payload.rating,
    reviewedAt: payload.reviewedAt, durationMs: payload.durationMs, stateBefore: payload.stateBefore,
    stateAfter: payload.stateAfter, offline: payload.offline, deviceId: payload.deviceId,
    sessionId: payload.sessionId, changeSeq, voided: false, eventAt: payload.eventAt,
    eventCounter: payload.eventCounter, eventDeviceId: payload.eventDeviceId, operationId: payload.operationId,
  };
  await db.reviewLogs.put(row);
  await clearResetMarkerIfPresent(db, payload);
}
async function applyReviewVoid(db: AccountDb, payload: ReviewVoidChangePayload): Promise<void> {
  const existing = await db.reviewLogs.get(payload.reviewId);
  await db.reviewLogs.update(payload.reviewId, { voided: true });
  await db.reviewVoids.put({ reviewId: payload.reviewId, voidedAt: payload.voidedAt, cardId: existing?.cardId ?? '' });
}
interface SettingsChange {
  readonly payload: SettingsChangePayload;
  readonly changeSeq: number;
}
async function applySettings(db: AccountDb, change: SettingsChange, userId: string): Promise<void> {
  const overlay = await pendingSettingsOverlay(db, userId);
  const settings: UserSettings = { ...change.payload, ...overlay, changeSeq: change.changeSeq };
  const current = await db.settings.get(userId);
  await db.settings.put({ ...settings, userId, fieldClocks: current?.fieldClocks ?? {} });
}
async function applyProfile(db: AccountDb, payload: ProfileChangePayload): Promise<void> {
  if (await hasUnresolvedOperation(db, payload.id, ['profile_patch'])) {
    return;
  }
  const current = await db.profile.get(payload.id);
  await db.profile.put({
    userId: payload.id,
    displayName: payload.displayName,
    displayNameClock: current?.displayNameClock ?? null,
  });
}
async function applyConflict(db: AccountDb, payload: ConflictChangePayload): Promise<void> {
  if (payload.expiredAt !== null) {
    await db.conflicts.delete(payload.id);
    return;
  }
  const existing = await db.conflicts.get(payload.id);
  await db.conflicts.put({
    id: payload.id,
    entityType: payload.entityType,
    entityId: payload.entityId,
    deckId: payload.deckId,
    reason: payload.reason,
    expiresAt: payload.expiresAt ?? existing?.expiresAt ?? '',
    detail: payload.restoredAt === null ? existing?.detail ?? null : null,
    restoredAt: payload.restoredAt,
  });
}
export async function applyChangeEntry(db: AccountDb, entry: ChangeEntry, userId: string): Promise<void> {
  if (entry.type === 'subject') {
    return applySubject(db, entry.payload as SubjectChangePayload, entry.changeSeq);
  }
  if (entry.type === 'deck') {
    return applyDeck(db, entry.payload as DeckChangePayload, entry.changeSeq);
  }
  if (entry.type === 'card') {
    return applyCard(db, entry.payload as CardChangePayload, entry.changeSeq);
  }
  if (entry.type === 'card_state') {
    return applyCardState(db, entry.payload as CardStateChangePayload, entry.changeSeq);
  }
  if (entry.type === 'review_log') {
    return applyReviewLog(db, entry.payload as ReviewLogChangePayload, entry.changeSeq);
  }
  if (entry.type === 'review_void') {
    return applyReviewVoid(db, entry.payload as ReviewVoidChangePayload);
  }
  if (entry.type === 'subscription') {
    return applySubscription(db, entry.payload as SubscriptionChangePayload, entry.changeSeq);
  }
  if (entry.type === 'settings') {
    return applySettings(db, { payload: entry.payload as SettingsChangePayload, changeSeq: entry.changeSeq }, userId);
  }
  if (entry.type === 'profile') {
    return applyProfile(db, entry.payload as ProfileChangePayload);
  }
  return applyConflict(db, entry.payload as ConflictChangePayload);
}
