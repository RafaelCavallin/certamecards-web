import { Component, computed, input, output } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { Tag } from '../../../../shared/ui/tag/tag';
import { OWN_DECK_ACTIONS } from '../../deck-page/deck-actions';
import type { DeckActions } from '../../deck-page/deck-actions';
import { offlineActionsNote } from './offline-actions-note';

@Component({
  selector: 'app-deck-header',
  imports: [Button, Tag],
  templateUrl: './deck-header.html',
})
export class DeckHeader {
  readonly name = input.required<string>();
  readonly subject = input<string>('');
  readonly actions = input<DeckActions>(OWN_DECK_ACTIONS);
  readonly badges = input<readonly string[]>([]);
  readonly online = input(true);
  protected readonly offlineNote = computed(() => offlineActionsNote(this.actions()));
  readonly edited = output<void>();
  readonly resetProgress = output<void>();
  readonly deleted = output<void>();
  readonly subscriptionCanceled = output<void>();
  readonly duplicated = output<void>();

  protected onEdit(): void {
    this.edited.emit();
  }

  protected onResetProgress(): void {
    this.resetProgress.emit();
  }

  protected onDelete(): void {
    this.deleted.emit();
  }

  protected onCancelSubscription(): void {
    this.subscriptionCanceled.emit();
  }

  protected onDuplicate(): void {
    this.duplicated.emit();
  }
}
