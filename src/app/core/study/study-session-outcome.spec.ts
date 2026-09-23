import { expect, it } from 'vitest';
import { CARD_STATE_LEARNING, CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import { FocusTimer } from './focus-timer';
import { applyRatingOutcome, sessionTotal } from './study-session-outcome';
import type { SessionRuntime } from './study-session-runtime';
import type { CurrentCard, UndoEntry } from './study-session.model';
import { UndoStack } from './undo-stack';

const DAY = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };

function aRuntime(): SessionRuntime {
  return {
    scope: { kind: 'all' },
    cardsById: new Map(),
    statesById: new Map(),
    queue: { main: [], learning: [] },
    undoStack: new UndoStack<UndoEntry>(30),
    timer: new FocusTimer(25, DAY.start),
    day: DAY,
    deviceId: 'device-1',
    sessionId: 'session-1',
    seenCardIds: new Set(),
    reviewed: 0,
    correct: 0,
    done: 0,
    revealedAt: null,
  };
}

function aCurrent(cardId: string): CurrentCard {
  return {
    ref: { cardId, deckId: 'd1', subjectId: 's1' },
    content: { id: cardId, deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null, createdAt: '', updatedAt: '', deletedAt: null, version: 1, changeSeq: 1 },
    state: null,
    isNew: true,
  };
}

function aNewState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-20T00:00:00Z',
    lastReview: '2026-09-18T09:00:00Z', reps: 1, lapses: 0, learningSteps: 0, scheduledDays: 2,
    reviewCount: 1, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}

it('TU — cartão que continua em aprendizado e vence hoje volta para a fila', () => {
  const runtime = aRuntime();
  const current = aCurrent('c1');
  const newState = aNewState({ state: CARD_STATE_LEARNING, due: '2026-09-18T08:00:00Z' });
  applyRatingOutcome({ runtime, current, newState, rating: 1 });
  expect(runtime.queue.learning).toHaveLength(1);
  expect(runtime.done).toBe(0);
  expect(runtime.correct).toBe(0);
});

it('TU — cartão que vira revisão conta como feito e nota alta soma acerto', () => {
  const runtime = aRuntime();
  const current = aCurrent('c1');
  const newState = aNewState();
  applyRatingOutcome({ runtime, current, newState, rating: 4 });
  expect(runtime.queue.learning).toHaveLength(0);
  expect(runtime.done).toBe(1);
  expect(runtime.correct).toBe(1);
  expect(runtime.seenCardIds.has('c1')).toBe(true);
});

it('TU — sessionTotal soma feitos, fila e o cartão atual', () => {
  const runtime = aRuntime();
  runtime.done = 2;
  runtime.queue.main.push({ card: { cardId: 'c2', deckId: 'd1', subjectId: 's1' }, due: DAY.start });
  expect(sessionTotal(runtime, true)).toBe(4);
  expect(sessionTotal(runtime, false)).toBe(3);
});
