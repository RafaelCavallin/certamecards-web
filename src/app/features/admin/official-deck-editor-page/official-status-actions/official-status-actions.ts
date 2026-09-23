import { Component, computed, inject, input, output, signal } from '@angular/core';
import { extractApiError } from '../../../../core/api/api-error.model';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import type { OfficialDeckAdminSummary } from '../../../../core/api/official-deck.model';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { adminErrorMessage } from '../../admin-errors';
import { STATUS_ACTIONS, actionsFor } from './status-action-config';
import type { StatusActionKey } from './status-action-config';

@Component({
  selector: 'app-official-status-actions',
  imports: [Button, ConfirmDialog],
  templateUrl: './official-status-actions.html',
})
export class OfficialStatusActions {
  private readonly api = inject(OfficialDecksApi);
  readonly deck = input.required<OfficialDeckAdminSummary>();
  readonly online = input(true);
  readonly changed = output<OfficialDeckAdminSummary>();
  readonly deleted = output<void>();
  protected readonly configs = STATUS_ACTIONS;
  protected readonly pending = signal<StatusActionKey | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly available = computed(() => actionsFor(this.deck().status));

  protected async onConfirm(key: StatusActionKey): Promise<void> {
    this.pending.set(null);
    this.errorMessage.set(null);
    try {
      await this.run(key);
    } catch (error) {
      this.errorMessage.set(adminErrorMessage(extractApiError(error)));
    }
  }

  private async run(key: StatusActionKey): Promise<void> {
    const { target } = STATUS_ACTIONS[key];
    if (target === null) {
      await this.api.delete(this.deck().id, this.deck().version);
      this.deleted.emit();
      return;
    }
    this.changed.emit(await this.api.changeStatus(this.deck().id, this.deck().version, target));
  }
}
