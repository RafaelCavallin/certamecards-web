import { Component, effect, input, output, signal } from '@angular/core';
import { FormField, submit } from '@angular/forms/signals';
import { Button } from '../button/button';
import { OfflineNotice } from '../offline-notice/offline-notice';
import { buildCardForm, emptyCardFormModel } from './card-content-form';
import type { CardFormModel } from './card-content-form';

const SAVE_SHORTCUT_KEYS = ['Enter'];
@Component({
  selector: 'app-card-form',
  imports: [FormField, OfflineNotice, Button],
  templateUrl: './card-form.html',
})
export class CardForm {
  readonly initial = input<CardFormModel | null>(null);
  readonly online = input(true);
  readonly keepOnSave = input(false);
  readonly submitLabel = input<string | null>(null);
  readonly saved = output<CardFormModel>();

  protected readonly isEditing = (): boolean => this.initial() !== null;
  protected readonly model = signal(emptyCardFormModel());
  protected readonly cardForm = buildCardForm(this.model);

  constructor() {
    effect(() => this.model.set(this.initial() ?? emptyCardFormModel()));
  }

  clear(): void {
    this.model.set(emptyCardFormModel());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && SAVE_SHORTCUT_KEYS.includes(event.key)) {
      event.preventDefault();
      this.onSubmit();
    }
  }

  protected onSubmit(): void {
    // eslint-disable-next-line @typescript-eslint/require-await -- submit() exige uma action assíncrona (Promise<TreeValidationResult>)
    void submit(this.cardForm, async () => {
      const value = this.model();
      this.saved.emit(value);
      if (!this.isEditing() && !this.keepOnSave()) {
        this.clear();
      }
    });
  }
}
