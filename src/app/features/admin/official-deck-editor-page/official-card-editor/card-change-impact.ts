import { Component, input, output } from '@angular/core';

export type ChangeKind = 'correction' | 'content';
export const NOTE_MAX_LENGTH = 200;
@Component({
  selector: 'app-card-change-impact',
  templateUrl: './card-change-impact.html',
})
export class CardChangeImpact {
  readonly subscribers = input.required<number>();
  readonly kind = input<ChangeKind | null>(null);
  readonly note = input('');
  readonly errorMessage = input<string | null>(null);
  readonly kindChange = output<ChangeKind>();
  readonly noteChange = output<string>();
  protected readonly noteMaxLength = NOTE_MAX_LENGTH;

  protected onNote(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) {
      this.noteChange.emit(event.target.value);
    }
  }
}
