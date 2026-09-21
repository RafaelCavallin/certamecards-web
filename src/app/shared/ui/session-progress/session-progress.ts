import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-session-progress',
  templateUrl: './session-progress.html',
})
export class SessionProgress {
  readonly current = input.required<number>();
  readonly total = input.required<number>();
  readonly label = input<string>('Revisão do dia');

  protected readonly percent = computed(() => (this.total() === 0 ? 100 : Math.round((this.current() / this.total()) * 100)));
}
