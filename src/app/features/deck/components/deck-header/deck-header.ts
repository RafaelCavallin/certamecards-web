import { Component, input, output } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';

@Component({
  selector: 'app-deck-header',
  imports: [Button],
  templateUrl: './deck-header.html',
})
export class DeckHeader {
  readonly name = input.required<string>();
  readonly subject = input<string>('');
  readonly edited = output<void>();
  readonly resetProgress = output<void>();
  readonly deleted = output<void>();

  protected onEdit(): void {
    this.edited.emit();
  }

  protected onResetProgress(): void {
    this.resetProgress.emit();
  }

  protected onDelete(): void {
    this.deleted.emit();
  }
}
