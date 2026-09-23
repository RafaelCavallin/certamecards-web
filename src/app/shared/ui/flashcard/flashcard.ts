import { Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Kbd } from '../kbd/kbd';

@Component({
  selector: 'app-flashcard',
  imports: [Button, Kbd],
  templateUrl: './flashcard.html',
})
export class Flashcard {
  readonly front = input.required<string>();
  readonly back = input.required<string>();
  readonly subject = input<string>('');
  readonly source = input<string | null>(null);
  readonly isNew = input(false);
  readonly isRelearning = input(false);
  readonly revealed = input(false);
  readonly notice = input<string | null>(null);

  readonly reveal = output<void>();

  protected onRevealClick(): void {
    this.reveal.emit();
  }
}
