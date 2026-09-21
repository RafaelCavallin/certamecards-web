import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { Card } from '../api/card.model';
import { CardsApi } from '../api/cards-api';
import { toCardRow } from '../db/card-row';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { SyncService } from '../sync/sync-service';
import { CardsData } from './cards-data';

let db: LocalDb;

function aCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'c1',
    deckId: 'd1',
    type: 'basic',
    front: 'Q',
    back: 'R',
    source: null,
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
    ...overrides,
  };
}
function setup(cardsApi: Partial<CardsApi>): { cardsData: CardsData; syncPull: ReturnType<typeof vi.fn> } {
  const syncPull = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [
      { provide: CardsApi, useValue: cardsApi },
      { provide: SyncService, useValue: { pull: syncPull } },
      { provide: EventsService, useValue: { record: vi.fn() } },
    ],
  });
  db = TestBed.inject(LocalDb);
  return { cardsData: TestBed.inject(CardsData), syncPull };
}

afterEach(async () => {
  await db.delete();
});

it('TU — byDeck devolve só os cartões não excluídos do deck', async () => {
  const { cardsData } = setup({});
  await db.cards.bulkAdd([
    toCardRow(aCard()),
    toCardRow(aCard({ id: 'c2', deletedAt: '2026-09-18T00:00:00Z' })),
    toCardRow(aCard({ id: 'c3', deckId: 'd2' })),
  ]);
  const cards = cardsData.byDeck('d1');
  await waitFor(() => cards().length > 0);
  expect(cards().map((card) => card.id)).toEqual(['c1']);
});

it('TU — allActive devolve os cartões não excluídos de todos os decks', async () => {
  const { cardsData } = setup({});
  await db.cards.bulkAdd([
    toCardRow(aCard()),
    toCardRow(aCard({ id: 'c2', deckId: 'd2' })),
    toCardRow(aCard({ id: 'c3', deletedAt: '2026-09-18T00:00:00Z' })),
  ]);
  await waitFor(() => cardsData.allActive().length > 0);
  expect(cardsData.allActive().map((card) => card.id).sort()).toEqual(['c1', 'c2']);
});

it('TU — create grava o cartão com searchText e sincroniza', async () => {
  const create = vi.fn().mockResolvedValue(aCard({ front: 'Mandado' }));
  const { cardsData, syncPull } = setup({ create });
  const created = await cardsData.create('d1', { id: 'c1', type: 'basic', front: 'Mandado', back: 'R', source: null });
  expect(created.front).toBe('Mandado');
  expect((await db.cards.get('c1'))?.searchText).toContain('mandado');
  expect(syncPull).toHaveBeenCalledOnce();
});

it('TU — update grava o cartão atualizado', async () => {
  const update = vi.fn().mockResolvedValue(aCard({ front: 'Nova pergunta', version: 2 }));
  const { cardsData } = setup({ update });
  await cardsData.update('c1', 1, { front: 'Nova pergunta' });
  expect(await db.cards.get('c1')).toMatchObject({ front: 'Nova pergunta', version: 2 });
});

it('TU — delete remove o cartão do Dexie', async () => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const { cardsData } = setup({ delete: deleteFn });
  await db.cards.add(toCardRow(aCard()));
  await cardsData.delete('c1', 1);
  expect(await db.cards.get('c1')).toBeUndefined();
});
