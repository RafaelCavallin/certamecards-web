import { ScrollingModule } from '@angular/cdk/scrolling';
import { Component, input, output } from '@angular/core';
import { CardListItem } from '../card-list-item/card-list-item';
import type { CardListRow } from './card-list.model';

function trackById(_index: number, row: CardListRow): string {
  return row.id;
}
const ITEM_SIZE_PX = 68;
@Component({
  selector: 'app-card-list',
  imports: [ScrollingModule, CardListItem],
  templateUrl: './card-list.html',
})
export class CardList {
  readonly rows = input.required<readonly CardListRow[]>();
  readonly opened = output<string>();

  protected readonly itemSize = ITEM_SIZE_PX;
  protected readonly trackById = trackById;

  protected onOpen(id: string): void {
    this.opened.emit(id);
  }
}
