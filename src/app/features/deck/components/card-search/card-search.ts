import { Component, input, output } from '@angular/core';

export type CardStateFilter = 'all' | 'new' | 'learning' | 'review' | 'suspended';
export const CARD_STATE_FILTER_OPTIONS: readonly { readonly value: CardStateFilter; readonly label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'new', label: 'Novos' },
  { value: 'learning', label: 'Aprendendo' },
  { value: 'review', label: 'Em revisão' },
  { value: 'suspended', label: 'Suspensos' },
];
@Component({
  selector: 'app-card-search',
  templateUrl: './card-search.html',
})
export class CardSearch {
  readonly query = input('');
  readonly stateFilter = input<CardStateFilter>('all');
  readonly queryChange = output<string>();
  readonly stateFilterChange = output<CardStateFilter>();

  protected readonly options = CARD_STATE_FILTER_OPTIONS;

  protected onQueryInput(event: Event): void {
    this.queryChange.emit((event.target as HTMLInputElement).value);
  }

  protected onStateFilterChange(event: Event): void {
    this.stateFilterChange.emit((event.target as HTMLSelectElement).value as CardStateFilter);
  }
}
