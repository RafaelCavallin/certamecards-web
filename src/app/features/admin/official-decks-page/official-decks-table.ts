import { Component, input, output } from '@angular/core';
import type { OfficialDeckAdminSummary } from '../../../core/api/official-deck.model';
import { formatDatePtBr } from '../../../shared/i18n/format-date';
import { OFFICIAL_STATUS_LABELS } from '../official-status-labels';

@Component({
  selector: 'app-official-decks-table',
  templateUrl: './official-decks-table.html',
  host: { class: 'block min-w-0' },
})
export class OfficialDecksTable {
  readonly decks = input.required<readonly OfficialDeckAdminSummary[]>();
  readonly open = output<string>();
  protected readonly statusLabels = OFFICIAL_STATUS_LABELS;
  protected readonly formatDate = formatDatePtBr;
}
