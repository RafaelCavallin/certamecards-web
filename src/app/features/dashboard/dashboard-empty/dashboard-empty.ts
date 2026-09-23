import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { LibraryDeckSummary } from '../../../core/api/library.model';
import { SuggestionsService } from '../../../core/library/suggestions-service';
import { cardsLabel } from '../../../shared/i18n/plural';
import { LibraryButton } from '../library-button/library-button';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-dashboard-empty',
  imports: [Button, LibraryButton],
  templateUrl: './dashboard-empty.html',
})
export class DashboardEmpty {
  private readonly router = inject(Router);
  protected readonly suggestions = signal<readonly LibraryDeckSummary[]>([]);

  constructor() {
    void inject(SuggestionsService)
      .load()
      .then((decks) => this.suggestions.set(decks));
  }

  protected cardsLabel(count: number): string {
    return cardsLabel(count);
  }

  protected onNewDeck(): void {
    void this.router.navigate(['/decks', 'novo']);
  }

  protected onOpenSuggestion(deckId: string): void {
    void this.router.navigate(['/biblioteca'], { queryParams: { deck: deckId } });
  }
}
