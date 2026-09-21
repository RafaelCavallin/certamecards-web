import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { formatInterval } from '../../../core/scheduler/format-interval';
import type { Rating } from '../../../core/scheduler/scheduler.model';
import { SettingsData } from '../../../core/data/settings-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { StudySessionStore } from '../../../core/study/study-session-store';
import { Button } from '../../../shared/ui/button/button';
import { Flashcard } from '../../../shared/ui/flashcard/flashcard';
import { FocusTimer } from '../../../shared/ui/focus-timer/focus-timer';
import { Kbd } from '../../../shared/ui/kbd/kbd';
import { RatingBar } from '../../../shared/ui/rating-bar/rating-bar';
import { SessionProgress } from '../../../shared/ui/session-progress/session-progress';
import { SessionSummary } from '../../../shared/ui/session-summary/session-summary';
import { focusTimerMode, intervalLabels } from '../study-page-view';
import { buildSummaryView, runStart } from '../study-page-session';
import { dispatchStudyShortcut } from '../study-shortcuts';
import type { StudyPhase, SummaryView } from '../study-page.model';

const SECOND_MS = 1000;
@Component({
  selector: 'app-study-page',
  imports: [Button, Flashcard, FocusTimer, Kbd, RatingBar, SessionProgress, SessionSummary],
  templateUrl: './study-page.html',
})
export class StudyPage {
  protected readonly store = inject(StudySessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly settingsData = inject(SettingsData);
  private readonly subjectsData = inject(SubjectsData);
  protected readonly current = this.store.current;
  protected readonly revealed = this.store.revealed;
  protected readonly done = this.store.done;
  protected readonly total = this.store.total;
  protected readonly canUndo = this.store.canUndo;
  protected readonly phase = signal<StudyPhase>('loading');
  protected readonly nextAvailableAt = signal<Date | null>(null);
  protected readonly nextAvailableLabel = computed(() => {
    const at = this.nextAvailableAt();
    return at === null ? '' : formatInterval(this.nowTick(), at);
  });
  protected readonly summary = signal<SummaryView | null>(null);
  private readonly nowTick = signal(new Date());
  protected readonly intervals = computed(() => intervalLabels(this.store.previews()));
  protected readonly subjectName = computed(() => {
    const subjectId = this.current()?.ref.subjectId;
    return this.subjectsData.all().find((subject) => subject.id === subjectId)?.name ?? '';
  });
  private readonly remainingSeconds = computed(() => Math.ceil(this.store.timerRemainingMs(this.nowTick()) / SECOND_MS));
  protected readonly timerMode = computed(() => focusTimerMode(this.remainingSeconds(), this.store.timerPaused()));
  protected readonly timerSeconds = computed(() => Math.max(0, this.remainingSeconds()));
  constructor() {
    void this.startSession();
    const intervalId = setInterval(() => this.nowTick.set(new Date()), SECOND_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.phase() !== 'session') {
      return;
    }
    dispatchStudyShortcut(event, {
      revealed: this.revealed(),
      reveal: () => this.store.reveal(),
      rate: (rating: Rating) => void this.onRate(rating),
      undo: () => void this.store.undo(),
      end: () => this.finish(),
    });
  }
  protected onTogglePause(): void {
    this.store.togglePause(new Date());
  }
  protected onContinue(): void {
    this.phase.set('loading');
    void this.startSession();
  }
  protected onBack(): void {
    void this.router.navigate(['/']);
  }
  protected onRateChoice(rating: Rating): void {
    void this.onRate(rating);
  }
  private async startSession(): Promise<void> {
    const outcome = await runStart(this.store, this.settingsData, this.route);
    this.nextAvailableAt.set(outcome.nextAvailableAt);
    this.phase.set(outcome.phase);
  }
  private async onRate(rating: Rating): Promise<void> {
    await this.store.rate(rating);
    if (this.store.finishedReason() !== null) {
      this.finish();
    }
  }
  private finish(): void {
    this.summary.set(buildSummaryView(this.store));
    this.phase.set('summary');
  }
}
