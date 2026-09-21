import { expect, it } from 'vitest';
import type { CardState } from '../api/card-state.model';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import { buildCurrentCard, captureUndoEntry, createRuntime, restoreUndoEntry, type SessionRuntime } from './study-session-runtime';

const DAY = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };

function aCard(id: string): Card {
  return { id, deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null, createdAt: '', updatedAt: '', deletedAt: null, version: 1, changeSeq: 1 };
}

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, changeSeq: 1, ...overrides,
  };
}

function assertNotNull<T>(value: T | null): T {
  if (value === null) {
    throw new Error('unexpected null');
  }
  return value;
}

function aRuntimeWith(cardsById: Map<string, Card>, statesById: Map<string, CardState>): SessionRuntime {
  return createRuntime({
    scope: { kind: 'all' },
    cardsById,
    statesById,
    queue: { main: [], learning: [] },
    day: DAY,
    deviceId: 'device-1',
    sessionId: 'session-1',
    focusMinutes: 25,
    now: DAY.start,
  });
}

it('TU — createRuntime usa o padrão de minutos quando focusMinutes é 0', () => {
  const runtime = aRuntimeWith(new Map(), new Map());
  expect(runtime.timer.remainingMs(DAY.start)).toBe(25 * 60_000);
});

it('TU — buildCurrentCard devolve null quando o cartão não está no mapa', () => {
  const runtime = aRuntimeWith(new Map(), new Map());
  expect(buildCurrentCard(runtime, { cardId: 'missing', deckId: 'd1', subjectId: 's1' })).toBeNull();
});

it('TU — buildCurrentCard monta o cartão atual com o estado correspondente', () => {
  const runtime = aRuntimeWith(new Map([['c1', aCard('c1')]]), new Map([['c1', aState()]]));
  const current = buildCurrentCard(runtime, { cardId: 'c1', deckId: 'd1', subjectId: 's1' });
  expect(current?.isNew).toBe(false);
  expect(current?.content.front).toBe('Q');
});

it('TU — captureUndoEntry e restoreUndoEntry restauram o estado anterior (cartão sem estado)', () => {
  const runtime = aRuntimeWith(new Map([['c1', aCard('c1')]]), new Map());
  const current = assertNotNull(buildCurrentCard(runtime, { cardId: 'c1', deckId: 'd1', subjectId: 's1' }));
  runtime.done = 1;
  const entry = captureUndoEntry(runtime, current, 'log-1');
  runtime.statesById.set('c1', aState());
  runtime.done = 2;
  restoreUndoEntry(runtime, entry);
  expect(runtime.done).toBe(1);
  expect(runtime.statesById.has('c1')).toBe(false);
});

it('TU — restoreUndoEntry restaura um estado anterior existente', () => {
  const previousState = aState({ reviewCount: 2 });
  const runtime = aRuntimeWith(new Map([['c1', aCard('c1')]]), new Map([['c1', previousState]]));
  const current = assertNotNull(buildCurrentCard(runtime, { cardId: 'c1', deckId: 'd1', subjectId: 's1' }));
  const entry = captureUndoEntry(runtime, current, 'log-1');
  runtime.statesById.set('c1', aState({ reviewCount: 4 }));
  restoreUndoEntry(runtime, entry);
  expect(runtime.statesById.get('c1')).toEqual(previousState);
});
