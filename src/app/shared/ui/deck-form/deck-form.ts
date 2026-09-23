import { Component, effect, input, output, signal } from '@angular/core';
import { FormField, submit } from '@angular/forms/signals';
import { Button } from '../button/button';
import { OfflineNotice } from '../offline-notice/offline-notice';
import { buildDeckForm, emptyDeckFormModel } from './deck-content-form';
import type { DeckFormModel } from './deck-content-form';

export interface SubjectOption {
  readonly id: string;
  readonly name: string;
}
@Component({
  selector: 'app-deck-form',
  imports: [FormField, OfflineNotice, Button],
  templateUrl: './deck-form.html',
})
export class DeckForm {
  readonly subjects = input.required<readonly SubjectOption[]>();
  readonly initial = input<DeckFormModel>(emptyDeckFormModel());
  readonly online = input(true);
  readonly submitLabel = input('Criar deck');
  readonly saved = output<DeckFormModel>();

  protected readonly model = signal(emptyDeckFormModel());
  protected readonly deckForm = buildDeckForm(this.model);

  constructor() {
    effect(() => this.model.set(this.initial()));
  }

  protected onSubmit(): void {
    // eslint-disable-next-line @typescript-eslint/require-await -- submit() exige uma action assíncrona (Promise<TreeValidationResult>)
    void submit(this.deckForm, async () => {
      this.saved.emit(this.model());
    });
  }
}
