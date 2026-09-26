import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { LibraryApi } from '../api/library-api';
import type { DeckContentPage } from '../api/library.model';
import { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { EventsService } from '../events/events-service';
import { SyncCycleCoordinator } from '../sync/sync-cycle-coordinator';
import { SubscriptionService } from './subscription-service';

let db: AccountDb;

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
function contentPage(overrides: Partial<DeckContentPage>): DeckContentPage {
  return { cards: [], cardStates: [], nextAfter: null, hasMore: false, ...overrides };
}
function setup(
  api: Partial<Record<keyof LibraryApi, ReturnType<typeof vi.fn>>>,
): { service: SubscriptionService; runNow: ReturnType<typeof vi.fn> } {
  const runNow = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [
      { provide: LibraryApi, useValue: api },
      { provide: SyncCycleCoordinator, useValue: { runNow } },
      { provide: EventsService, useValue: { record: vi.fn() } },
    ],
  });
  db = new AccountDb('subscription-service-failure-test');
  TestBed.inject(CurrentAccountDb).set({ db, userId: 'subscription-service-failure-test' });
  return { service: TestBed.inject(SubscriptionService), runNow };
}

afterEach(async () => {
  await db.delete();
});

it('TI-53 — falha no meio do snapshot não deixa deck nem cartões gravados', async () => {
  const content = vi.fn()
    .mockResolvedValueOnce(contentPage({ cards: [aCard('c1')], nextAfter: 'c1', hasMore: true }))
    .mockRejectedValueOnce(new Error('queda de rede'));
  const subscribe = vi.fn().mockResolvedValue({ deck: DECK, subscription: SUBSCRIPTION, restoredProgress: false });
  const { service, runNow } = setup({ subscribe, content });
  await expect(service.subscribe('d1')).rejects.toThrow('queda de rede');
  expect(await db.decks.count()).toBe(0);
  expect(await db.cards.count()).toBe(0);
  expect(await db.syncOperations.count()).toBe(0);
  expect(runNow).not.toHaveBeenCalled();
});

it('TI-53 — falha ao gravar no Dexie desfaz a transação inteira', async () => {
  const badCard = { ...aCard('c1'), id: undefined } as unknown as Card;
  const content = vi.fn().mockResolvedValue(contentPage({ cards: [badCard] }));
  const subscribe = vi.fn().mockResolvedValue({ deck: DECK, subscription: SUBSCRIPTION, restoredProgress: false });
  const { service } = setup({ subscribe, content });
  await expect(service.subscribe('d1')).rejects.toThrow();
  expect(await db.decks.count()).toBe(0);
  expect(await db.subscriptions.count()).toBe(0);
});
