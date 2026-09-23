import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { EventsService } from '../../../core/events/events-service';
import { Button } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-library-button',
  imports: [Button],
  template: `<button appButton variant="ghost" size="sm" type="button" (click)="onOpen()">{{ label() }}</button>`,
})
export class LibraryButton {
  private readonly router = inject(Router);
  private readonly events = inject(EventsService);
  readonly label = input.required<string>();
  readonly source = input<'menu' | 'empty_state'>('menu');

  protected onOpen(): void {
    void this.events.record('library_opened', { source: this.source() });
    void this.router.navigate(['/biblioteca']);
  }
}
