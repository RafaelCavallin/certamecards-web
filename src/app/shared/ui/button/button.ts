import { Directive, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'quiet' | 'ghost';
export type ButtonSize = 'md' | 'sm';
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-amber border-amber text-on-amber hover:brightness-[1.06]',
  quiet: 'bg-surface-raised border-line-strong text-ink hover:border-ink-muted',
  ghost: 'bg-transparent border-transparent text-ink-muted hover:text-ink hover:border-line',
};
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-[var(--control-height)] px-4',
  sm: 'h-11 px-3 sm:h-9',
};
@Directive({
  selector: 'button[appButton]',
  host: {
    '[class]': 'classes()',
    '[attr.type]': 'type()',
  },
})
export class Button {
  readonly variant = input<ButtonVariant>('quiet');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit'>('button');
  protected readonly classes = computed(
    () =>
      `inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:opacity-55 ${VARIANT_CLASSES[this.variant()]} ${SIZE_CLASSES[this.size()]}`,
  );
}
