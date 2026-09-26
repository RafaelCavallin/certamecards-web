import { expect, it, vi } from 'vitest';
import { CARD_STATE_REVIEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import type { ReviewRecorder } from './review-recorder';
import { rateSession, startSession } from './study-session-actions';
import { createRuntime } from './study-session-runtime';
import type { StudySessionLoader } from './study-session-loader';

const DAY = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };
const NOW = new Date('2026-09-18T09:00:00Z');

function aCard(id: string): Card {
  return { id, deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null, createdAt: '', updatedAt: '', deletedAt: null, version: 1, changeSeq: 1 };
}

function aState(overrides: Partial<CardState> = {}): CardState {
  return {
    cardId: 'c1', state: CARD_STATE_REVIEW, stability: 4, difficulty: 5, due: '2026-09-18T08:00:00Z',
    lastReview: '2026-09-10T00:00:00Z', reps: 3, lapses: 0, learningSteps: 0, scheduledDays: 7,
    reviewCount: 3, suspended: false, contentUpdateNote: null, contentUpdatedAt: null, changeSeq: 1, ...overrides,
  };
}

function loaderReturning(cards: Card[], states: CardState[]): StudySessionLoader {
  const statesById = new Map(states.map((state) => [state.cardId, state]));
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const studyCards = cards.map((card) => ({ cardId: card.id, deckId: card.deckId, subjectId: 's1' }));
  return {
    load: vi.fn().mockResolvedValue({
      cardsById,
      statesById,
      queueInput: { cards: studyCards, states: statesById, scope: { kind: 'all' }, newLimit: 20, reviewLimit: 9999 },
      day: DAY,
      deviceId: 'device-1',
    }),
  } as unknown as StudySessionLoader;
}

it('TU — startSession devolve started=false sem cartões disponíveis', async () => {
  const outcome = await startSession(loaderReturning([], []), { kind: 'all' }, 25);
  expect(outcome.result.started).toBe(false);
  expect(outcome.session).toBeNull();
});

it('TU — startSession monta a sessão quando há cartão disponível', async () => {
  const outcome = await startSession(loaderReturning([aCard('c1')], [aState()]), { kind: 'all' }, 25);
  expect(outcome.result.started).toBe(true);
  expect(outcome.current?.ref.cardId).toBe('c1');
});

function recorderReturning(state: CardState): ReviewRecorder {
  return {
    compute: vi.fn().mockReturnValue({ state, log: { id: 'log-1' } }),
    persist: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReviewRecorder;
}

it('TU — rateSession encerra por bloco de foco quando o tempo acabou', () => {
  const runtime = createRuntime({
    scope: { kind: 'all' },
    cardsById: new Map([['c1', aCard('c1')]]),
    statesById: new Map(),
    queue: { main: [], learning: [] },
    day: DAY,
    deviceId: 'device-1',
    sessionId: 'session-1',
    focusMinutes: 1,
    now: NOW,
  });
  const current = { ref: { cardId: 'c1', deckId: 'd1', subjectId: 's1' }, content: aCard('c1'), state: null, isNew: true };
  const recorder = recorderReturning(aState());
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW.getTime() + 90_000));
  const outcome = rateSession({ recorder, session: runtime, current, rating: 3 });
  vi.useRealTimers();
  expect(outcome.finishedReason).toBe('focus_block');
  expect(outcome.nextCurrent).toBeNull();
});

it('TU — rateSession devolve completed quando a fila acaba', () => {
  const runtime = createRuntime({
    scope: { kind: 'all' },
    cardsById: new Map([['c1', aCard('c1')]]),
    statesById: new Map(),
    queue: { main: [], learning: [] },
    day: DAY,
    deviceId: 'device-1',
    sessionId: 'session-1',
    focusMinutes: 25,
    now: NOW,
  });
  const current = { ref: { cardId: 'c1', deckId: 'd1', subjectId: 's1' }, content: aCard('c1'), state: null, isNew: true };
  const recorder = recorderReturning(aState());
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW.getTime() + 60_000));
  const outcome = rateSession({ recorder, session: runtime, current, rating: 3 });
  vi.useRealTimers();
  expect(outcome.finishedReason).toBe('completed');
  expect(outcome.nextCurrent).toBeNull();
});
