import { generateUuidV7 } from '../db/uuid7';
import type { Rating } from '../scheduler/scheduler.model';
import { buildQueue, nextCard } from './queue-builder';
import type { ReviewRecorder } from './review-recorder';
import { DEFAULT_FOCUS_MINUTES } from './study-constants';
import type { StudySessionLoader } from './study-session-loader';
import { buildCurrentCard, captureUndoEntry, createRuntime, type SessionRuntime } from './study-session-runtime';
import { applyRatingOutcome } from './study-session-outcome';
import type { CurrentCard, FinishedReason, SessionScope, StartResult } from './study-session.model';

export interface StartOutcome {
  readonly session: SessionRuntime | null;
  readonly current: CurrentCard | null;
  readonly result: StartResult;
}
export async function startSession(
  loader: StudySessionLoader,
  scope: SessionScope,
  focusMinutes: number,
): Promise<StartOutcome> {
  const now = new Date();
  const loaded = await loader.load(scope, now);
  const queue = buildQueue(loaded.queueInput, loaded.day);
  const picked = nextCard(queue, now);
  if (picked.card === null) {
    return { session: null, current: null, result: { started: false, nextAvailableAt: picked.nextAvailableAt } };
  }
  const session = createRuntime({
    scope,
    cardsById: loaded.cardsById,
    statesById: loaded.statesById,
    queue,
    day: loaded.day,
    deviceId: loaded.deviceId,
    sessionId: generateUuidV7(),
    focusMinutes: focusMinutes || DEFAULT_FOCUS_MINUTES,
    now,
  });
  const current = buildCurrentCard(session, picked.card);
  return { session, current, result: { started: true, nextAvailableAt: null } };
}
export interface RateOutcome {
  readonly nextCurrent: CurrentCard | null;
  readonly finishedReason: FinishedReason;
}
export interface RateSessionInput {
  readonly recorder: ReviewRecorder;
  readonly session: SessionRuntime;
  readonly current: CurrentCard;
  readonly rating: Rating;
}
export async function rateSession(input: RateSessionInput): Promise<RateOutcome> {
  const { recorder, session, current, rating } = input;
  const now = new Date();
  const durationMs = Math.min(now.getTime() - (session.revealedAt ?? now.getTime()), 600_000);
  const result = await recorder.record({
    previousState: current.state,
    rating,
    now,
    cardId: current.ref.cardId,
    durationMs,
    deviceId: session.deviceId,
    sessionId: session.sessionId,
  });
  session.undoStack.push(captureUndoEntry(session, current, result.logId));
  applyRatingOutcome({ runtime: session, current, newState: result.state, rating });
  if (session.timer.isBlockDone(now)) {
    return { nextCurrent: null, finishedReason: 'focus_block' };
  }
  const picked = nextCard(session.queue, now);
  const nextCurrent = picked.card === null ? null : buildCurrentCard(session, picked.card);
  return { nextCurrent, finishedReason: picked.card === null ? 'completed' : null };
}
