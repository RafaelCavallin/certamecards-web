import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import type { ReviewLogRow } from '../db/local-db.model';
import { SchedulerService } from './scheduler-service';

const RELEARNING_AFTER = {
  cardId: 'c1', state: 3, stability: 14.21, difficulty: 5.26, due: '2026-09-19T14:05:00Z',
  lastReview: '2026-09-05T11:00:00Z', reps: 4, lapses: 0, learningSteps: 0, scheduledDays: 0,
};
const INHERITED_AFTER = { ...RELEARNING_AFTER, state: 2, due: '2026-10-01T00:00:00Z', reps: 3 };

function aLog(overrides: Partial<ReviewLogRow>): ReviewLogRow {
  return {
    id: 'log', cardId: 'c1', kind: 'review', rating: 3, reviewedAt: '2026-09-17T12:00:00Z', durationMs: 0,
    stateBefore: null, stateAfter: {}, offline: false, deviceId: 'device-1', sessionId: null,
    changeSeq: 0, voided: false, ...overrides,
  };
}
function setup(): SchedulerService {
  TestBed.configureTestingModule({});
  return TestBed.inject(SchedulerService);
}

it('TU-33 — replay aplica content_update reproduzindo o stateAfter e contando no reviewCount', () => {
  const scheduler = setup();
  const review = aLog({ id: 'a', reviewedAt: '2026-09-05T11:00:00Z' });
  const update = aLog({
    id: 'b', kind: 'content_update', rating: null, reviewedAt: '2026-09-19T14:05:00Z', stateAfter: RELEARNING_AFTER,
  });
  const replayed = scheduler.replay([update, review]);
  expect(replayed).toMatchObject({ ...RELEARNING_AFTER, reviewCount: 2, suspended: false });
});

it('TU-33 — replay preserva suspensão e changeSeq do estado anterior ao content_update', () => {
  const scheduler = setup();
  const update = aLog({ kind: 'content_update', rating: null, stateAfter: RELEARNING_AFTER });
  expect(scheduler.replay([update])).toMatchObject({ suspended: false, changeSeq: 0, reviewCount: 1 });
});

it('TU-34 — replay aplica duplicate como semente e segue com as avaliações seguintes', () => {
  const scheduler = setup();
  const seed = aLog({ id: 'a', kind: 'duplicate', rating: null, stateAfter: INHERITED_AFTER });
  const seeded = scheduler.replay([seed]);
  expect(seeded).toMatchObject({ ...INHERITED_AFTER, reviewCount: 1 });
  const later = aLog({ id: 'b', reviewedAt: '2026-10-01T00:00:00Z', rating: 3 });
  expect(scheduler.replay([seed, later])?.reviewCount).toBe(2);
});

it('TU-34 — replay ignora stateAfter inválido e mantém o estado anterior', () => {
  const scheduler = setup();
  const broken = aLog({ kind: 'duplicate', rating: null, stateAfter: { state: 'x' } });
  expect(scheduler.replay([broken])).toBeNull();
  const seed = aLog({ id: 'a', kind: 'duplicate', rating: null, stateAfter: INHERITED_AFTER });
  const brokenLater = aLog({ id: 'b', reviewedAt: '2026-09-18T12:00:00Z', kind: 'content_update', rating: null, stateAfter: null });
  expect(scheduler.replay([seed, brokenLater])).toMatchObject({ ...INHERITED_AFTER, reviewCount: 2 });
});
