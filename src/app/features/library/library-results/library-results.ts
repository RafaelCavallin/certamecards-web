import { Component, computed, input, output } from '@angular/core';
import type { LibraryDeckPage, LibraryDeckSummary } from '../../../core/api/library.model';
import { pluralize } from '../../../shared/i18n/plural';
import { Button } from '../../../shared/ui/button/button';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import type { LibraryView } from '../library-view';
import { LibraryDeckItem } from '../library-deck-item/library-deck-item';

const PAGE_SIZE_FALLBACK = 20;
@Component({
  selector: 'app-library-results',
  imports: [Button, OfflineNotice, LibraryDeckItem],
  templateUrl: './library-results.html',
})
export class LibraryResults {
  readonly view = input.required<LibraryView>();
  readonly result = input.required<LibraryDeckPage | null>();
  readonly preview = output<LibraryDeckSummary>();
  readonly openDeck = output<string>();
  readonly pageChange = output<number>();
  readonly retry = output<void>();
  readonly clear = output<void>();
  readonly back = output<void>();
  protected readonly items = computed(() => this.result()?.items ?? []);
  protected readonly announcement = computed(() => pluralize(this.result()?.total ?? 0, 'deck encontrado', 'decks encontrados'));
  protected readonly hasPrevious = computed(() => (this.result()?.page ?? 0) > 0);
  protected readonly hasNext = computed(() => {
    const result = this.result();
    return result !== null && (result.page + 1) * (result.size || PAGE_SIZE_FALLBACK) < result.total;
  });

  protected onPage(delta: number): void {
    this.pageChange.emit((this.result()?.page ?? 0) + delta);
  }
}
