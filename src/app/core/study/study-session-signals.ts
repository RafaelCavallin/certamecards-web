import type { WritableSignal } from '@angular/core';
import { sessionTotal } from './study-session-outcome';
import type { SessionRuntime } from './study-session-runtime';
import type { CurrentCard, FinishedReason, PreviewByRating } from './study-session.model';

export interface SessionSignals {
  readonly current: WritableSignal<CurrentCard | null>;
  readonly revealed: WritableSignal<boolean>;
  readonly previews: WritableSignal<PreviewByRating | null>;
  readonly done: WritableSignal<number>;
  readonly total: WritableSignal<number>;
  readonly canUndo: WritableSignal<boolean>;
  readonly finishedReason: WritableSignal<FinishedReason>;
}
export function setCurrent(signals: SessionSignals, session: SessionRuntime | null, current: CurrentCard | null): void {
  signals.current.set(current);
  signals.revealed.set(false);
  signals.previews.set(null);
  syncCounters(signals, session, current !== null);
}
export function syncCounters(signals: SessionSignals, session: SessionRuntime | null, hasCurrent: boolean): void {
  if (session === null) {
    return;
  }
  signals.done.set(session.done);
  signals.total.set(sessionTotal(session, hasCurrent));
  signals.canUndo.set(session.undoStack.canUndo);
}
export function remainingCount(session: SessionRuntime | null, hasCurrent: boolean): number {
  if (session === null) {
    return 0;
  }
  return session.queue.main.length + session.queue.learning.length + (hasCurrent ? 1 : 0);
}
export function resetSignals(signals: SessionSignals): void {
  signals.current.set(null);
  signals.revealed.set(false);
  signals.previews.set(null);
  signals.done.set(0);
  signals.total.set(0);
  signals.canUndo.set(false);
}
