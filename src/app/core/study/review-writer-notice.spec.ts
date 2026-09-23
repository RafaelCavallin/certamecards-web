import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import { LocalDb } from '../db/local-db';
import { ReviewWriter } from './review-writer';

let db: LocalDb;

const STATE_WITH_NOTICE: CardState = {
  cardId: 'c1', state: 2, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
  lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
  reviewCount: 3, suspended: false, contentUpdateNote: 'Mudou o prazo.', contentUpdatedAt: '2026-09-17T00:00:00Z',
  changeSeq: 1,
};

afterEach(async () => {
  await db.delete();
});

it('TU-43 — record limpa o aviso de atualização do estado local ao gravar a avaliação', async () => {
  TestBed.configureTestingModule({});
  db = TestBed.inject(LocalDb);
  await TestBed.inject(ReviewWriter).record({
    log: {
      id: 'l1', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-18T09:00:00Z', durationMs: 1000,
      stateBefore: null, stateAfter: {}, offline: false, deviceId: 'd1', sessionId: null, changeSeq: 0,
    },
    state: STATE_WITH_NOTICE,
  });
  const stored = await db.cardStates.get('c1');
  expect(stored).toMatchObject({ contentUpdateNote: null, contentUpdatedAt: null, reviewCount: 3 });
});
