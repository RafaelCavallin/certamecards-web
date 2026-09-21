import { CARD_STATE_NEW } from '../api/card-state.model';
import type { CardState } from '../api/card-state.model';
import type { Card } from '../api/card.model';
import { FocusTimer } from './focus-timer';
import type { QueueState, StudyCard, StudyDayWindow } from './queue.model';
import { DEFAULT_FOCUS_MINUTES, UNDO_STACK_LIMIT } from './study-constants';
import type { CurrentCard, SessionScope, UndoEntry } from './study-session.model';
import { UndoStack } from './undo-stack';

export interface SessionRuntime {
  readonly scope: SessionScope;
  readonly cardsById: ReadonlyMap<string, Card>;
  statesById: Map<string, CardState>;
  readonly queue: QueueState;
  readonly undoStack: UndoStack<UndoEntry>;
  readonly timer: FocusTimer;
  readonly day: StudyDayWindow;
  readonly deviceId: string;
  readonly sessionId: string;
  seenCardIds: Set<string>;
  reviewed: number;
  correct: number;
  done: number;
  revealedAt: number | null;
}
export interface CreateRuntimeInput {
  readonly scope: SessionScope;
  readonly cardsById: ReadonlyMap<string, Card>;
  readonly statesById: Map<string, CardState>;
  readonly queue: QueueState;
  readonly day: StudyDayWindow;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly focusMinutes: number;
  readonly now: Date;
}
export function createRuntime(input: CreateRuntimeInput): SessionRuntime {
  return {
    scope: input.scope,
    cardsById: input.cardsById,
    statesById: input.statesById,
    queue: input.queue,
    undoStack: new UndoStack<UndoEntry>(UNDO_STACK_LIMIT),
    timer: new FocusTimer(input.focusMinutes || DEFAULT_FOCUS_MINUTES, input.now),
    day: input.day,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    seenCardIds: new Set<string>(),
    reviewed: 0,
    correct: 0,
    done: 0,
    revealedAt: null,
  };
}
export function buildCurrentCard(runtime: SessionRuntime, ref: StudyCard): CurrentCard | null {
  const content = runtime.cardsById.get(ref.cardId);
  if (content === undefined) {
    return null;
  }
  const state = runtime.statesById.get(ref.cardId) ?? null;
  return { ref, content, state, isNew: state === null || state.state === CARD_STATE_NEW };
}
export function captureUndoEntry(runtime: SessionRuntime, current: CurrentCard, writtenLogId: string): UndoEntry {
  return {
    writtenLogId,
    cardId: current.ref.cardId,
    previousState: current.state,
    current,
    queueMain: [...runtime.queue.main],
    queueLearning: [...runtime.queue.learning],
    done: runtime.done,
    reviewed: runtime.reviewed,
    correct: runtime.correct,
    seenCardIds: [...runtime.seenCardIds],
  };
}
export function restoreUndoEntry(runtime: SessionRuntime, entry: UndoEntry): void {
  runtime.queue.main = [...entry.queueMain];
  runtime.queue.learning = [...entry.queueLearning];
  runtime.done = entry.done;
  runtime.reviewed = entry.reviewed;
  runtime.correct = entry.correct;
  runtime.seenCardIds = new Set(entry.seenCardIds);
  if (entry.previousState === null) {
    runtime.statesById.delete(entry.cardId);
    return;
  }
  runtime.statesById.set(entry.cardId, entry.previousState);
}
