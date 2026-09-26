import type { ElementRef} from '@angular/core';
import { Component, Injector, afterNextRender, computed, inject, input, signal, viewChild } from '@angular/core';
import { MAX_CARDS_PER_DECK, MAX_CARDS_PER_USER } from '../../../core/sync/card-limits';
import { syncActionMessage } from '../../../core/sync/sync-action-message';
import { SyncActionResolver } from '../../../core/sync/sync-action-resolver';
import type { SyncActionRequired } from '../../../core/sync/sync-status.model';
import { pluralize } from '../../../shared/i18n/plural';
import { Button } from '../../../shared/ui/button/button';

const RETRYABLE_CODES: ReadonlySet<string> = new Set(['user_card_limit', 'deck_card_limit', 'quota']);
const AUTH_REQUIRED = 'auth_required';
const COUNT_FORMAT = new Intl.NumberFormat('pt-BR');
const LIMIT_LABELS: Readonly<Record<string, string>> = {
  deck_card_limit: `Limite: ${COUNT_FORMAT.format(MAX_CARDS_PER_DECK)} cartões por deck.`,
  user_card_limit: `Limite: ${COUNT_FORMAT.format(MAX_CARDS_PER_USER)} cartões por conta.`,
};
let nextConfirmId = 0;
@Component({ selector: 'app-sync-action-item', imports: [Button], templateUrl: './sync-action-item.html' })
export class SyncActionItem {
  readonly action = input.required<SyncActionRequired>();
  private readonly resolver = inject(SyncActionResolver);
  private readonly injector = inject(Injector);
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirmButton');
  private readonly discardButton = viewChild<ElementRef<HTMLButtonElement>>('discardButton');
  protected readonly confirmId = `sync-discard-${nextConfirmId++}`;
  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly affected = signal(1);
  protected readonly feedback = signal('');
  protected readonly message = computed(() => syncActionMessage(this.action().code));
  protected readonly retryable = computed(() => RETRYABLE_CODES.has(this.action().code));
  protected readonly discardable = computed(() => this.action().code !== AUTH_REQUIRED);
  protected readonly limitNote = computed(() => {
    const { code, knownCardCount } = this.action();
    return knownCardCount === null ? '' : `${LIMIT_LABELS[code] ?? ''} Neste dispositivo: ${COUNT_FORMAT.format(knownCardCount)} ${knownCardCount === 1 ? 'cartão' : 'cartões'}.`.trim();
  });
  protected readonly confirmText = computed(
    () => `${pluralize(this.affected(), 'alteração será removida', 'alterações serão removidas')} deste dispositivo. Elas nunca chegaram ao servidor e não poderão ser recuperadas.`,
  );
  protected readonly confirmLabel = computed(() => (this.affected() === 1 ? 'Descartar alteração' : `Descartar ${this.affected()} alterações`));

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.action().copyText ?? '');
      this.feedback.set('Texto copiado.');
    } catch {
      this.feedback.set('Não foi possível copiar. Abra “Ver texto da alteração” e copie manualmente.');
    }
  }

  protected async retry(): Promise<void> {
    await this.run(() => this.resolver.retry(this.action().operationId));
  }

  protected async askDiscard(): Promise<void> {
    this.affected.set(await this.resolver.affectedCount(this.action().operationId));
    this.confirming.set(true);
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancelDiscard(): void {
    this.confirming.set(false);
    afterNextRender(() => this.discardButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async discard(): Promise<void> {
    await this.run(() => this.resolver.discard(this.action().operationId));
  }

  private async run(task: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await task();
    } catch {
      this.feedback.set('Não foi possível concluir agora. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
  }
}
