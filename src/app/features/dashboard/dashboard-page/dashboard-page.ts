import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardStatesData } from '../../../core/data/card-states-data';
import { CardsData } from '../../../core/data/cards-data';
import { DEFAULT_NEW_PER_DAY, computeDeckCounts } from '../../../core/data/deck-counts';
import { DecksData } from '../../../core/data/decks-data';
import { SettingsData } from '../../../core/data/settings-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { deckBadges } from '../../../core/library/deck-badges';
import { AuthStore } from '../../../core/auth/auth-store';
import { SyncStatusStore } from '../../../core/sync/sync-status-store';
import { Button } from '../../../shared/ui/button/button';
import { DeckRow } from '../../../shared/ui/deck-row/deck-row';
import { SignOutButton } from '../../settings/sign-out-button/sign-out-button';
import { SettingsSheet } from '../../settings/settings-sheet/settings-sheet';
import { SyncIndicator } from '../../../shared/ui/sync-indicator/sync-indicator';
import { Tag } from '../../../shared/ui/tag/tag';
import { dashboardContextLine, greetingForHour } from '../../../shared/i18n/plural';
import { LibraryButton } from '../library-button/library-button';
import { DashboardEmpty } from '../dashboard-empty/dashboard-empty';
import { examDaysUntil } from '../dashboard-dates';
import { Last14Days } from '../last-14-days/last-14-days';

const ALL_SUBJECTS = 'all';
@Component({
  selector: 'app-dashboard-page',
  imports: [Button, DashboardEmpty, LibraryButton, DeckRow, Tag, SyncIndicator, SignOutButton, Last14Days, SettingsSheet],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly authStore = inject(AuthStore);
  private readonly decksData = inject(DecksData);
  private readonly cardsData = inject(CardsData);
  private readonly cardStatesData = inject(CardStatesData);
  private readonly settingsData = inject(SettingsData);
  private readonly subjectsData = inject(SubjectsData);
  private readonly router = inject(Router);
  protected readonly syncService = inject(SyncStatusStore);
  protected readonly badgesOf = deckBadges;
  protected readonly selectedSubjectId = signal<string>(ALL_SUBJECTS);
  protected readonly settingsOpen = signal(false);
  protected readonly greeting = computed(() => greetingForHour(new Date().getHours()));
  protected readonly firstName = computed(() => this.authStore.user()?.displayName.split(' ').at(0) ?? '');
  protected readonly hasDecks = computed(() => this.decksData.active().length > 0);
  private readonly subjectNameById = computed(
    () => new Map(this.subjectsData.all().map((subject) => [subject.id, subject.name])),
  );

  private readonly deckCounts = computed(() =>
    computeDeckCounts({
      decks: this.decksData.active(),
      cards: this.cardsData.allActive(),
      states: this.cardStatesData.byCardId(),
      now: new Date(),
      newPerDay: this.settingsData.current()?.newPerDay ?? DEFAULT_NEW_PER_DAY,
    }),
  );
  protected readonly visibleDeckCounts = computed(() => {
    const subjectId = this.selectedSubjectId();
    return subjectId === ALL_SUBJECTS
      ? this.deckCounts()
      : this.deckCounts().filter((entry) => entry.deck.subjectId === subjectId);
  });
  protected readonly subjectFilters = computed(() => {
    const deckSubjectIds = new Set(this.decksData.active().map((deck) => deck.subjectId));
    return this.subjectsData.active().filter((subject) => deckSubjectIds.has(subject.id));
  });
  protected readonly contextLine = computed(() =>
    dashboardContextLine({
      deckCount: this.decksData.active().length,
      dueCount: this.visibleDeckCounts().reduce((sum, entry) => sum + entry.due, 0),
      newCount: this.visibleDeckCounts().reduce((sum, entry) => sum + entry.fresh, 0),
      examDaysUntil: examDaysUntil(this.settingsData.current()?.examDate ?? null),
    }),
  );
  protected readonly canStartSession = computed(() =>
    this.visibleDeckCounts().some((entry) => entry.due > 0 || entry.fresh > 0),
  );
  protected subjectName(subjectId: string): string {
    return this.subjectNameById().get(subjectId) ?? '';
  }

  protected onOpenDeck(deckId: string): void {
    void this.router.navigate(['/decks', deckId]);
  }

  protected onOpenSync(): void {
    void this.router.navigate(['/sincronizacao']);
  }

  protected onNewDeck(): void {
    void this.router.navigate(['/decks', 'novo']);
  }

  protected onStartSession(): void {
    const subjectId = this.selectedSubjectId();
    const queryParams = subjectId === ALL_SUBJECTS ? {} : { subject: subjectId };
    void this.router.navigate(['/estudar'], { queryParams });
  }

  protected onStudyDeck(deckId: string): void {
    void this.router.navigate(['/estudar'], { queryParams: { deck: deckId } });
  }
}
