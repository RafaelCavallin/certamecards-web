import type { ReviewRecorder } from './review-recorder';
import { buildSessionSummary, type SessionSummary } from './session-summary';
import { restoreUndoEntry, type SessionRuntime } from './study-session-runtime';
import { remainingCount } from './study-session-signals';
import type { CurrentCard, FinishedReason } from './study-session.model';

export function sessionEndedProps(summary: SessionSummary, reason: FinishedReason): Record<string, unknown> {
  return { reviews: summary.reviewed, correct: summary.correct, focusMinutes: summary.focusMinutes, reason };
}
export function endSession(session: SessionRuntime | null, hasCurrent: boolean): SessionSummary {
  const now = new Date();
  return buildSessionSummary({
    reviewed: session?.reviewed ?? 0,
    correct: session?.correct ?? 0,
    uniqueCardIds: session?.seenCardIds ?? new Set<string>(),
    elapsedMs: session === null ? 0 : session.timer.elapsedMs(now),
    cardsLeftNow: remainingCount(session, hasCurrent),
    blockDone: session?.timer.isBlockDone(now) ?? false,
  });
}
export async function undoSession(recorder: ReviewRecorder, session: SessionRuntime): Promise<CurrentCard | null> {
  const entry = session.undoStack.pop();
  if (entry === undefined) {
    return null;
  }
  await recorder.undo(entry.writtenLogId, entry.cardId, entry.previousState);
  restoreUndoEntry(session, entry);
  session.revealedAt = Date.now();
  return entry.current;
}
