import { Component, input, output } from '@angular/core';
import { Tag } from '../../../../shared/ui/tag/tag';

@Component({
  selector: 'app-card-list-item',
  imports: [Tag],
  templateUrl: './card-list-item.html',
})
export class CardListItem {
  readonly front = input.required<string>();
  readonly back = input.required<string>();
  readonly source = input<string | null>(null);
  readonly dueText = input.required<string>();
  readonly leech = input(false);
  readonly suspended = input(false);
  readonly open = output<void>();

  protected onOpen(): void {
    this.open.emit();
  }
}
