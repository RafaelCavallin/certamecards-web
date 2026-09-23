import { Component, input } from '@angular/core';
import type { PreviewCard } from '../../../core/api/library.model';

@Component({
  selector: 'app-preview-card-list',
  template: `
    <ol class="space-y-3" aria-label="Primeiros cartões do deck">
      @for (card of cards(); track card.id) {
        <li class="space-y-1 rounded-md bg-surface p-3">
          <p class="font-semibold text-ink">{{ card.front }}</p>
          <p class="text-sm text-ink-muted">{{ card.back }}</p>
          @if (card.source) {
            <p class="text-xs text-ink-muted">Fonte: {{ card.source }}</p>
          }
        </li>
      }
    </ol>
  `,
})
export class PreviewCardList {
  readonly cards = input.required<readonly PreviewCard[]>();
}
