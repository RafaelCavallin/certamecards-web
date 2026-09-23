import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Tag } from '../tag/tag';

@Component({
  selector: 'app-deck-row',
  imports: [Button, Tag],
  templateUrl: './deck-row.html',
})
export class DeckRow {
  readonly title = input.required<string>();
  readonly subject = input<string>('');
  readonly badges = input<readonly string[]>([]);
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
