import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import type { ChangesPage } from '../api/sync.model';
import { LocalDb } from '../db/local-db';
import { applyChangesPage } from './apply-changes-page';

let db: LocalDb;

function emptyPage(overrides: Partial<ChangesPage> = {}): ChangesPage {
  return {
    subjects: [], decks: [], cards: [], cardStates: [], reviewLogs: [], reviewVoids: [], subscriptions: [],
    settings: null, nextCursor: 0, hasMore: false, ...overrides,
  };
}
function aDeck(): ChangesPage['decks'][number] {
  return {
    id: 'd1', subjectId: 's1', name: 'CF/88', description: null, origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
    createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 1,
  };
}
function aCard(): ChangesPage['cards'][number] {
  return {
    id: 'c1', deckId: 'd1', type: 'basic', front: 'Mandado de segurança', back: '120 dias', source: null,
    createdAt: '2026-09-17T00:00:00Z', updatedAt: '2026-09-17T00:00:00Z', deletedAt: null, version: 1, changeSeq: 2,
  };
}
function aCardState(): ChangesPage['cardStates'][number] {
  return {
    cardId: 'c1', state: 2, stability: 4.1, difficulty: 5.2, due: '2026-10-01T00:00:00Z',
    lastReview: '2026-09-17T00:00:00Z', reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 4,
    reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 3,
  };
}
function aReviewLog(): ChangesPage['reviewLogs'][number] {
  return {
    id: 'r1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-17T00:00:00Z', durationMs: 4000,
    stateBefore: null, stateAfter: {}, offline: false, deviceId: 'dev1', sessionId: null, changeSeq: 4,
  };
}
function aSettings(): NonNullable<ChangesPage['settings']> {
  return { newPerDay: 20, reviewsPerDay: 9999, focusMinutes: 25, examDate: null, timeZone: 'UTC', theme: 'noite', changeSeq: 1 };
}

afterEach(async () => {
  await db.delete();
});

it('TI-26 — aplica decks, cartões, estados e logs recebidos', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await applyChangesPage(
    db,
    emptyPage({ decks: [aDeck()], cards: [aCard()], cardStates: [aCardState()], reviewLogs: [aReviewLog()] }),
  );
  expect(await db.decks.get('d1')).toMatchObject({ name: 'CF/88' });
  expect((await db.cards.get('c1'))?.searchText).toContain('mandado');
  expect(await db.cardStates.get('c1')).toMatchObject({ state: 2 });
  expect(await db.reviewLogs.get('r1')).toMatchObject({ voided: false });
});

it('TI-26 — anulação marca o log correspondente como voided', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await applyChangesPage(db, emptyPage({ reviewLogs: [aReviewLog()] }));
  await applyChangesPage(
    db,
    emptyPage({ reviewVoids: [{ reviewId: 'r1', voidedAt: '2026-09-17T01:00:00Z', changeSeq: 5 }] }),
  );
  expect(await db.reviewLogs.get('r1')).toMatchObject({ voided: true });
});

it('TI-26 — settings recebido sem sessão local não é gravado', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await applyChangesPage(db, emptyPage({ settings: aSettings() }));
  expect(await db.settings.count()).toBe(0);
});

it('TU — settings recebido com sessão local grava para o usuário atual', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await db.setSession({ userId: 'u1', email: 'a@a.com', displayName: 'Ana', role: 'candidate', termsAccepted: true });
  await applyChangesPage(db, emptyPage({ settings: aSettings() }));
  expect(await db.settings.get('u1')).toMatchObject({ newPerDay: 20 });
});
