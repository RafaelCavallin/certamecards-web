import { expect, it, vi } from 'vitest';
import type { Card } from '../api/card.model';
import type { ReviewRecorder } from './review-recorder';
import { endSession, sessionEndedProps, undoSession } from './study-session-lifecycle';
import { createRuntime } from './study-session-runtime';

const DAY = { start: new Date('2026-09-18T07:00:00Z'), end: new Date('2026-09-19T07:00:00Z') };
const NOW = new Date('2026-09-18T09:00:00Z');

function aCard(id: string): Card {
  return { id, deckId: 'd1', type: 'basic', front: 'Q', back: 'R', source: null, createdAt: '', updatedAt: '', deletedAt: null, version: 1, changeSeq: 1 };
}

it('TU — endSession sem sessão devolve um resumo zerado', () => {
  const summary = endSession(null, false);
  expect(summary).toEqual({ reviewed: 0, correct: 0, focusMinutes: 0, uniqueCards: 0, cardsLeftNow: 0, blockDone: false });
});

it('TU — undoSession devolve null quando a pilha está vazia', async () => {
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
  const undoMock = vi.fn();
  const recorder = { undo: undoMock } as unknown as ReviewRecorder;
  const restored = await undoSession(recorder, runtime);
  expect(restored).toBeNull();
  expect(undoMock).not.toHaveBeenCalled();
});

it('TU — sessionEndedProps monta os dados do evento a partir do resumo', () => {
  const summary = endSession(null, false);
  const props = sessionEndedProps({ ...summary, reviewed: 10, correct: 7, focusMinutes: 25 }, 'completed');
  expect(props).toEqual({ reviews: 10, correct: 7, focusMinutes: 25, reason: 'completed' });
});
