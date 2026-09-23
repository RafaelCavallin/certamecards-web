import { Component, input, output } from '@angular/core';
import type { LibraryDeckSummary } from '../../../core/api/library.model';
import { formatDatePtBr } from '../../../shared/i18n/format-date';
import { cardsLabel } from '../../../shared/i18n/plural';
import { Button } from '../../../shared/ui/button/button';
import { Tag } from '../../../shared/ui/tag/tag';

@Component({
  selector: 'app-library-deck-item',
  imports: [Button, Tag],
  templateUrl: './library-deck-item.html',
})
export class LibraryDeckItem {
  readonly deck = input.required<LibraryDeckSummary>();
  readonly preview = output<void>();
  readonly openDeck = output<void>();

  protected cardsLabel(count: number): string {
    return cardsLabel(count);
  }

  protected updatedAt(isoDate: string): string {
    return formatDatePtBr(isoDate);
  }

  protected onPreview(): void {
    this.preview.emit();
  }

  protected onOpenDeck(): void {
    this.openDeck.emit();
  }
}
