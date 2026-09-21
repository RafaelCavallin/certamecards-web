import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';

@Component({
  selector: 'app-deck-row',
  imports: [Button],
  templateUrl: './deck-row.html',
})
export class DeckRow {
  readonly title = input.required<string>();
  readonly subject = input<string>('');
  readonly due = input(0);
  readonly fresh = input(0);
  readonly study = output<void>();
  readonly open = output<void>();

  protected onStudy(): void {
    this.study.emit();
  }

  protected onOpen(): void {
    this.open.emit();
  }
}
