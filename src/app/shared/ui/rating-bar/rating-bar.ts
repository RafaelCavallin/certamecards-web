import { Component, input, output } from '@angular/core';
import { Kbd } from '../kbd/kbd';

export interface RatingOption {
  readonly rating: 1 | 2 | 3 | 4;
  readonly label: string;
  readonly interval: string;
  readonly toneClass: string;
  readonly key: string;
}
const RATING_OPTIONS: readonly RatingOption[] = [
  { rating: 1, label: 'De novo', interval: '', toneClass: 'text-rate-again', key: '1' },
  { rating: 2, label: 'Difícil', interval: '', toneClass: 'text-rate-hard', key: '2' },
  { rating: 3, label: 'Bom', interval: '', toneClass: 'text-rate-good', key: '3' },
  { rating: 4, label: 'Fácil', interval: '', toneClass: 'text-rate-easy', key: '4' },
];
@Component({
  selector: 'app-rating-bar',
  imports: [Kbd],
  templateUrl: './rating-bar.html',
})
export class RatingBar {
  readonly intervals = input.required<Readonly<Record<1 | 2 | 3 | 4, string>>>();

  readonly rate = output<1 | 2 | 3 | 4>();

  protected readonly options = RATING_OPTIONS;

  protected intervalFor(rating: 1 | 2 | 3 | 4): string {
    return this.intervals()[rating];
  }

  protected onRate(rating: 1 | 2 | 3 | 4): void {
    this.rate.emit(rating);
  }
}
