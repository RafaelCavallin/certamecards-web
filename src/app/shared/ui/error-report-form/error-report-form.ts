import { Component, input, output, signal } from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { Button } from '../button/button';

export type ErrorReportFormPhase = 'closed' | 'form' | 'sending' | 'already' | 'sent';
export type ErrorReportReasonView = 'outdated_content' | 'wrong_answer' | 'typo' | 'other';
export interface ErrorReportDraft {
  readonly reason: ErrorReportReasonView;
  readonly note: string | null;
}
export const NOTE_MAX_LENGTH = 500;
const REASONS: readonly { readonly value: ErrorReportReasonView; readonly label: string }[] = [
  { value: 'outdated_content', label: 'Conteúdo desatualizado' },
  { value: 'wrong_answer', label: 'Resposta errada' },
  { value: 'typo', label: 'Erro de digitação' },
  { value: 'other', label: 'Outro' },
];
@Component({
  selector: 'app-error-report-form',
  imports: [Button, FormField],
  templateUrl: './error-report-form.html',
})
export class ErrorReportForm {
  readonly phase = input.required<ErrorReportFormPhase>();
  readonly errorMessage = input<string | null>(null);
  readonly submitted = output<ErrorReportDraft>();
  readonly closed = output<void>();
  protected readonly reasons = REASONS;
  protected readonly noteMaxLength = NOTE_MAX_LENGTH;
  protected readonly model = signal<{ reason: ErrorReportReasonView; note: string }>({ reason: 'outdated_content', note: '' });
  protected readonly reportForm = form(this.model, (schemaPath) => {
    maxLength(schemaPath.note, NOTE_MAX_LENGTH, { message: `Use até ${NOTE_MAX_LENGTH} caracteres.` });
  });

  protected onSelectReason(reason: ErrorReportReasonView): void {
    this.model.update((current) => ({ ...current, reason }));
  }

  protected onSubmit(): void {
    if (this.reportForm().invalid()) {
      return;
    }
    const note = this.model().note.trim();
    this.submitted.emit({ reason: this.model().reason, note: note === '' ? null : note });
  }
}
