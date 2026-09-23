import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { generateUuidV7 } from '../../../../core/db/uuid7';
import { DUPLICATE_TEXTS } from '../../../../core/library/duplicate-options';
import type { DuplicateChoice } from '../../../../core/library/duplicate-options';
import { libraryErrorMessage } from '../../../../core/library/library-messages';
import { SubscriptionService } from '../../../../core/library/subscription-service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DuplicateDeckDialog } from '../../../../shared/ui/duplicate-deck-dialog/duplicate-deck-dialog';

export const CANCEL_SUBSCRIPTION_MESSAGE =
  'O deck sai do seu painel. Seu progresso fica guardado por 90 dias: se você se inscrever de novo nesse período, ele volta.';
@Component({
  selector: 'app-official-deck-dialogs',
  imports: [ConfirmDialog, DuplicateDeckDialog],
  templateUrl: './official-deck-dialogs.html',
})
export class OfficialDeckDialogs {
  private readonly subscriptions = inject(SubscriptionService);
  private readonly router = inject(Router);
  readonly deckId = input.required<string>();
  readonly cancelOpen = input(false);
  readonly duplicateOpen = input(false);
  readonly dismissed = output<void>();
  protected readonly texts = DUPLICATE_TEXTS;
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cancelMessage = computed(() => this.errorMessage() ?? CANCEL_SUBSCRIPTION_MESSAGE);

  protected onConfirmCancel(): Promise<void> {
    return this.run(async () => {
      await this.subscriptions.cancel(this.deckId());
      await this.router.navigate(['/']);
    });
  }

  protected onConfirmDuplicate(choice: DuplicateChoice): Promise<void> {
    return this.run(async () => {
      const copy = await this.subscriptions.duplicate(this.deckId(), generateUuidV7(), choice);
      await this.router.navigate(['/decks', copy.id]);
    });
  }

  protected onDismiss(): void {
    this.errorMessage.set(null);
    this.dismissed.emit();
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await action();
      this.dismissed.emit();
    } catch (error) {
      this.errorMessage.set(libraryErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
