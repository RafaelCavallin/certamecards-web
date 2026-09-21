import { Component, computed, input, output } from '@angular/core';

export type FocusTimerMode = 'focus' | 'pause' | 'done';
const SECONDS_PER_MINUTE = 60;
const MODE_LABELS: Record<FocusTimerMode, string> = { focus: 'Foco', pause: 'Pausado', done: 'Bloco concluído' };
const MODE_DOT_CLASSES: Record<FocusTimerMode, string> = { focus: 'bg-amber', pause: 'bg-ink-faint', done: 'bg-rate-good' };
function pad(value: number): string {
  return String(value).padStart(2, '0');
}
@Component({
  selector: 'app-focus-timer',
  templateUrl: './focus-timer.html',
})
export class FocusTimer {
  readonly seconds = input.required<number>();
  readonly mode = input.required<FocusTimerMode>();

  readonly pauseToggle = output<void>();

  protected readonly timeLabel = computed(() => {
    const minutes = Math.floor(this.seconds() / SECONDS_PER_MINUTE);
    const remainder = this.seconds() % SECONDS_PER_MINUTE;
    return `${pad(minutes)}:${pad(remainder)}`;
  });

  protected readonly modeLabel = computed(() => MODE_LABELS[this.mode()]);

  protected readonly dotClass = computed(() => MODE_DOT_CLASSES[this.mode()]);

  protected onToggle(): void {
    this.pauseToggle.emit();
  }
}
