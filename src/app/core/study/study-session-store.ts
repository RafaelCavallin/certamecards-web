import { Injectable, inject, signal } from '@angular/core';
import { EventsService } from '../events/events-service';
import type { Rating } from '../scheduler/scheduler.model';
import { ReviewRecorder } from './review-recorder';
import type { SessionSummary } from './session-summary';
import { rateSession, startSession } from './study-session-actions';
import { endSession, sessionEndedProps, undoSession } from './study-session-lifecycle';
import { StudySessionLoader } from './study-session-loader';
import type { SessionRuntime } from './study-session-runtime';
import { resetSignals, setCurrent, syncCounters, type SessionSignals } from './study-session-signals';
import type { CurrentCard, FinishedReason, PreviewByRating, SessionScope, StartResult } from './study-session.model';

@Injectable({ providedIn: 'root' })
export class StudySessionStore {
  private readonly loader = inject(StudySessionLoader);
  private readonly recorder = inject(ReviewRecorder);
  private readonly eventsService = inject(EventsService);
  private session: SessionRuntime | null = null;
  private readonly signals: SessionSignals = {
    current: signal<CurrentCard | null>(null),
    revealed: signal(false),
    previews: signal<PreviewByRating | null>(null),
    done: signal(0),
    total: signal(0),
    canUndo: signal(false),
    finishedReason: signal<FinishedReason>(null),
  };

  readonly current = this.signals.current.asReadonly();
  readonly revealed = this.signals.revealed.asReadonly();
  readonly previews = this.signals.previews.asReadonly();
  readonly done = this.signals.done.asReadonly();
  readonly total = this.signals.total.asReadonly();
  readonly canUndo = this.signals.canUndo.asReadonly();
  readonly finishedReason = this.signals.finishedReason.asReadonly();

  async start(scope: SessionScope, focusMinutes: number): Promise<StartResult> {
    const outcome = await startSession(this.loader, scope, focusMinutes);
    this.session = outcome.session;
    this.signals.finishedReason.set(null);
    setCurrent(this.signals, this.session, outcome.current);
    if (outcome.result.started) {
      void this.eventsService.record('session_started', { scope: scope.kind });
    }
    return outcome.result;
  }
  reveal(): void {
    const current = this.signals.current();
    if (this.session === null || current === null || this.signals.revealed()) {
      return;
    }
    this.session.revealedAt = Date.now();
    this.signals.revealed.set(true);
    this.signals.previews.set(this.recorder.preview(current.state, new Date()));
  }
  timerRemainingMs(now: Date): number {
    return this.session === null ? 0 : this.session.timer.remainingMs(now);
  }
  timerPaused(): boolean {
    return this.session?.timer.paused ?? false;
  }
  togglePause(now: Date): void {
    this.session?.timer.togglePause(now);
  }
  rate(rating: Rating): Promise<void> {
    const { session } = this;
    const current = this.signals.current();
    if (session === null || current === null || !this.signals.revealed()) {
      return Promise.resolve();
    }
    const outcome = rateSession({ recorder: this.recorder, session, current, rating });
    setCurrent(this.signals, session, outcome.nextCurrent);
    this.signals.finishedReason.set(outcome.finishedReason);
    return Promise.resolve();
  }
  async flushPendingWrites(): Promise<void> {
    await this.session?.pendingWrite;
  }
  async undo(): Promise<void> {
    const { session } = this;
    if (session === null) {
      return;
    }
    const restored = await undoSession(this.recorder, session);
    if (restored === null) {
      return;
    }
    this.signals.current.set(restored);
    this.signals.revealed.set(true);
    this.signals.previews.set(this.recorder.preview(restored.state, new Date()));
    syncCounters(this.signals, session, true);
    void this.eventsService.record('review_undone', {});
  }
  end(): SessionSummary {
    if (this.signals.finishedReason() === null) {
      this.signals.finishedReason.set('ended_manually');
    }
    const summary = endSession(this.session, this.signals.current() !== null);
    void this.eventsService.record('session_ended', sessionEndedProps(summary, this.signals.finishedReason()));
    this.session = null;
    resetSignals(this.signals);
    return summary;
  }
}
