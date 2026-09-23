import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import type { Deck } from '../api/deck.model';
import { DecksApi } from '../api/decks-api';
import { LocalDb } from '../db/local-db';
import { EventsService } from '../events/events-service';
import { SyncService } from '../sync/sync-service';
import { DecksData } from './decks-data';

let db: LocalDb;

function aDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'd1',
    subjectId: 's1',
    name: 'CF/88',
    description: null,
    origin: 'own',
    originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-17T00:00:00Z',
    updatedAt: '2026-09-17T00:00:00Z',
    deletedAt: null,
    version: 1,
    changeSeq: 1,
    ...overrides,
  };
}
function setup(decksApi: Partial<DecksApi>): { decksData: DecksData; syncPull: ReturnType<typeof vi.fn> } {
  const syncPull = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    providers: [
      { provide: DecksApi, useValue: decksApi },
      { provide: SyncService, useValue: { pull: syncPull } },
      { provide: EventsService, useValue: { record: vi.fn() } },
    ],
  });
  db = TestBed.inject(LocalDb);
  return { decksData: TestBed.inject(DecksData), syncPull };
}

afterEach(async () => {
  await db.delete();
});

it('TU — active devolve só os decks não excluídos', async () => {
  const { decksData } = setup({});
  await db.decks.bulkAdd([aDeck(), aDeck({ id: 'd2', deletedAt: '2026-09-18T00:00:00Z' })]);
  await waitFor(() => decksData.active().length > 0);
  expect(decksData.active().map((deck) => deck.id)).toEqual(['d1']);
});

it('TU — create grava o deck retornado pela API no Dexie e sincroniza', async () => {
  const create = vi.fn().mockResolvedValue(aDeck());
  const { decksData, syncPull } = setup({ create });
  const created = await decksData.create({ id: 'd1', subjectId: 's1', name: 'CF/88', description: null });
  expect(created.id).toBe('d1');
  expect(await db.decks.get('d1')).toMatchObject({ name: 'CF/88' });
  expect(syncPull).toHaveBeenCalledOnce();
});

it('TU — update grava a nova versão do deck', async () => {
  const update = vi.fn().mockResolvedValue(aDeck({ name: 'Novo nome', version: 2 }));
  const { decksData } = setup({ update });
  await decksData.update('d1', 1, { name: 'Novo nome' });
  expect(await db.decks.get('d1')).toMatchObject({ name: 'Novo nome', version: 2 });
});

it('TU — delete remove o deck do Dexie', async () => {
  const deleteFn = vi.fn().mockResolvedValue(undefined);
  const { decksData } = setup({ delete: deleteFn });
  await db.decks.add(aDeck());
  await decksData.delete('d1', 1);
  expect(await db.decks.get('d1')).toBeUndefined();
});

it('TU — resetProgress aciona a API e sincroniza', async () => {
  const resetProgress = vi.fn().mockResolvedValue({ resetCards: 3, cursorHint: 10 });
  const { decksData, syncPull } = setup({ resetProgress });
  await decksData.resetProgress('d1');
  expect(resetProgress).toHaveBeenCalledWith('d1');
  expect(syncPull).toHaveBeenCalledOnce();
});
