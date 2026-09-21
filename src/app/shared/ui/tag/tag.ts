import { Component, computed, input } from '@angular/core';

export type TagTone = 'neutral' | 'accent';
@Component({
  selector: 'app-tag',
  template: `<span [class]="classes()"><ng-content /></span>`,
})
export class Tag {
  readonly tone = input<TagTone>('neutral');
  protected readonly classes = computed(() =>
    this.tone() === 'accent'
      ? 'inline-flex h-6 items-center rounded-sm bg-amber-soft px-2 text-xs font-medium text-ink'
      : 'inline-flex h-6 items-center rounded-sm border border-line bg-surface px-2 text-xs font-medium text-ink-muted',
  );
}
