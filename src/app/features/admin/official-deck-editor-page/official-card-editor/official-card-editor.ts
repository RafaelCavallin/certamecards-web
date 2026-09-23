import { Component, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { extractApiError } from '../../../../core/api/api-error.model';
import type { Card } from '../../../../core/api/card.model';
import type { OfficialStatus } from '../../../../core/api/deck.model';
import { OfficialDecksApi } from '../../../../core/api/official-decks-api';
import { generateUuidV7 } from '../../../../core/db/uuid7';
import type { CardFormModel } from '../../../../shared/ui/card-form/card-content-form';
import { CardForm } from '../../../../shared/ui/card-form/card-form';
import { Sheet } from '../../../../shared/ui/sheet/sheet';
import { adminErrorMessage } from '../../admin-errors';
import { CardChangeImpact } from './card-change-impact';
import { EMPTY_CHOICE, buildUpdateRequest, impactError, needsImpactChoice } from './official-card-request';
import type { ImpactChoice } from './official-card-request';

@Component({
  selector: 'app-official-card-editor',
  imports: [CardChangeImpact, CardForm, Sheet],
  templateUrl: './official-card-editor.html',
})
export class OfficialCardEditor {
  private readonly api = inject(OfficialDecksApi);
  private readonly form = viewChild(CardForm);
  readonly open = input(false);
  readonly deckId = input.required<string>();
  readonly card = input<Card | null>(null);
  readonly status = input.required<OfficialStatus>();
  readonly subscribers = input(0);
  readonly online = input(true);
  readonly saved = output<void>();
  readonly closed = output<void>();
  protected readonly choice = signal<ImpactChoice>(EMPTY_CHOICE);
  protected readonly impactMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly needsImpact = computed(() => this.card() !== null && needsImpactChoice(this.status()));
  protected readonly initial = computed<CardFormModel | null>(() => {
    const current = this.card();
    return current === null ? null : { front: current.front, back: current.back, source: current.source ?? '' };
  });

  constructor() {
    effect(() => {
      this.card();
      this.open();
      this.choice.set(EMPTY_CHOICE);
      this.impactMessage.set(null);
      this.errorMessage.set(null);
    });
  }

  protected async onSaved(content: CardFormModel): Promise<void> {
    this.errorMessage.set(null);
    const current = this.card();
    const message = current === null ? null : impactError(this.status(), this.choice());
    this.impactMessage.set(message);
    if (message !== null) {
      return;
    }
    try {
      await this.persist(content, current);
      this.saved.emit();
    } catch (error) {
      this.handleFailure(extractApiError(error));
    }
  }

  private async persist(content: CardFormModel, current: Card | null): Promise<void> {
    if (current !== null) {
      await this.api.updateCard(current.id, current.version, buildUpdateRequest(content, this.status(), this.choice()));
      this.closed.emit();
      return;
    }
    const source = content.source === '' ? null : content.source;
    await this.api.createCard(this.deckId(), { id: generateUuidV7(), type: 'basic', ...content, source });
    this.form()?.clear();
  }

  private handleFailure(apiError: ReturnType<typeof extractApiError>): void {
    const noteField = apiError?.fields?.find((field) => field.field === 'note');
    if (noteField !== undefined) {
      this.impactMessage.set(noteField.message);
      return;
    }
    this.errorMessage.set(adminErrorMessage(apiError));
  }
}
