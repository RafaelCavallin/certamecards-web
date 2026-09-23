import { Component, effect, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import type { LibraryDeckSummary } from '../../../core/api/library.model';
import { Button } from '../../../shared/ui/button/button';
import { Tag } from '../../../shared/ui/tag/tag';
import { DeckPreviewSheet } from '../deck-preview-sheet/deck-preview-sheet';
import { LibraryListStore } from '../library-list-store';
import { LibraryResults } from '../library-results/library-results';

const DECK_QUERY_PARAM = 'deck';
@Component({
  selector: 'app-library-page',
  imports: [Button, FormField, Tag, LibraryResults, DeckPreviewSheet],
  providers: [LibraryListStore],
  templateUrl: './library-page.html',
})
export class LibraryPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(LibraryListStore);
  protected readonly model = signal({ term: '' });
  protected readonly searchForm = form(this.model);
  protected readonly previewDeckId = signal<string | null>(this.route.snapshot.queryParamMap.get(DECK_QUERY_PARAM));

  constructor() {
    effect(() => this.store.setTerm(this.searchForm.term().value()));
  }

  protected onPreview(deck: LibraryDeckSummary): void {
    this.previewDeckId.set(deck.id);
  }

  protected onOpenDeck(deckId: string): void {
    void this.router.navigate(['/decks', deckId]);
  }

  protected onClosePreview(): void {
    this.previewDeckId.set(null);
  }

  protected onBack(): void {
    void this.router.navigate(['/']);
  }

  protected onClear(): void {
    this.model.set({ term: '' });
    this.store.clearFilters();
  }
}
