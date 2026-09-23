import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { LibraryApi } from '../api/library-api';
import type { DeckContentPage } from '../api/library.model';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { SyncService } from '../sync/sync-service';
import { SubscriptionService } from './subscription-service';

let db: LocalDb;
const record = vi.fn();

const DECK = {
  id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'official_subscription', originRef: null,
  originLabel: null, officialStatus: 'published', cardCount: 2, contentUpdatedAt: null,
  createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
} satisfies Deck;
const SUBSCRIPTION = { deckId: 'd1', subscribedAt: '2026-09-19T00:00:00Z', cancelledAt: null, changeSeq: 2 };

function aCard(id: string): Card {
  return {
    id, deckId: 'd1', type: 'basic', front: `F ${id}`, back: 'B', source: null,
    createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 3,
  };
}
function aState(cardId: string): CardState {
  return {
    cardId, state: 2, stability: 4, difficulty: 5, due: '2026-10-01T00:00:00Z', lastReview: null, reps: 1, lapses: 0,
    learningSteps: 0, scheduledDays: 4, reviewCount: 1, suspended: false, contentUpdateNote: null,
    contentUpdatedAt: null, changeSeq: 4,
  };
}
function contentPage(overrides: Partial<DeckContentPage>): DeckContentPage {
  return { cards: [], cardStates: [], nextAfter: null, hasMore: false, ...overrides };
}
function setup(api: Partial<Record<keyof LibraryApi, ReturnType<typeof vi.fn>>>): { service: SubscriptionService; pull: ReturnType<typeof vi.fn> } {
  const pull = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [{ provide: LibraryApi, useValue: api }, { provide: SyncService, useValue: { pull } }, { provide: EventsService, useValue: { record } }],
  });
  db = TestBed.inject(LocalDb);
  return { service: TestBed.inject(SubscriptionService), pull };
}

afterEach(async () => {
  await db.delete();
});

it('TI-53 — subscribe grava o snapshot paginado no Dexie e faz o pull', async () => {
  const content = vi.fn()
    .mockResolvedValueOnce(contentPage({ cards: [aCard('c1')], cardStates: [aState('c1')], nextAfter: 'c1', hasMore: true }))
    .mockResolvedValueOnce(contentPage({ cards: [aCard('c2')] }));
  const subscribe = vi.fn().mockResolvedValue({ deck: DECK, subscription: SUBSCRIPTION, restoredProgress: false });
  const { service, pull } = setup({ subscribe, content });
  const deck = await service.subscribe('d1');
  expect(deck.id).toBe('d1');
  expect(content).toHaveBeenNthCalledWith(1, 'd1', null);
  expect(content).toHaveBeenNthCalledWith(2, 'd1', 'c1');
  expect(await db.cards.count()).toBe(2);
  expect(await db.cardStates.count()).toBe(1);
  expect(await db.decks.get('d1')).toBeDefined();
  expect(await db.subscriptions.get('d1')).toEqual(SUBSCRIPTION);
  expect(pull).toHaveBeenCalledOnce();
  expect(record).toHaveBeenCalledWith('deck_subscribed', { deckId: 'd1', cardCount: 2, restoredProgress: false });
});

it('TU — cancel remove deck, cartões e estados locais e faz o pull', async () => {
  const unsubscribe = vi.fn().mockResolvedValue(undefined);
  const { service, pull } = setup({ unsubscribe });
  await db.decks.put(DECK);
  await db.cards.put({ ...aCard('c1'), searchText: 'f' });
  await db.cardStates.put(aState('c1'));
  await service.cancel('d1');
  expect(unsubscribe).toHaveBeenCalledWith('d1');
  expect(record).toHaveBeenCalledWith('deck_unsubscribed', { deckId: 'd1' });
  expect([await db.decks.count(), await db.cards.count(), await db.cardStates.count()]).toEqual([0, 0, 0]);
  expect(pull).toHaveBeenCalledOnce();
});

it('TU — cancel com falha na API não apaga nada local', async () => {
  const unsubscribe = vi.fn().mockRejectedValue(new Error('x'));
  const { service } = setup({ unsubscribe });
  await db.decks.put(DECK);
  await expect(service.cancel('d1')).rejects.toThrow('x');
  expect(await db.decks.count()).toBe(1);
});

it('TU — duplicate envia as escolhas, faz o pull e devolve a cópia', async () => {
  const duplicate = vi.fn().mockResolvedValue({ deck: { ...DECK, id: 'n1' }, copiedCards: 2, carriedStates: 1, cursorHint: 9 });
  const { service, pull } = setup({ duplicate });
  const deck = await service.duplicate('d1', 'n1', { carryProgress: true, cancelSubscription: true });
  expect(duplicate).toHaveBeenCalledWith('d1', { id: 'n1', carryProgress: true, cancelSubscription: true });
  expect(deck.id).toBe('n1');
  expect(record).toHaveBeenCalledWith('deck_duplicated', { sourceDeckId: 'd1', mode: 'carry', cancelledSubscription: true });
  expect(pull).toHaveBeenCalledOnce();
});
