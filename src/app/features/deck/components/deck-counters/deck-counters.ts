import { Component, input } from '@angular/core';
import type { DeckCardCounters } from '../../deck-page/deck-card-counters';

@Component({
  selector: 'app-deck-counters',
  templateUrl: './deck-counters.html',
})
export class DeckCounters {
  readonly counters = input.required<DeckCardCounters>();
}
