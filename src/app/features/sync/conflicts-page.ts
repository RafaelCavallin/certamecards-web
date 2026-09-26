import type { ElementRef} from '@angular/core';
import { Component, Injector, afterNextRender, computed, effect, inject, signal, viewChild, viewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardsData } from '../../core/data/cards-data';
import { DecksData } from '../../core/data/decks-data';
import { ConflictCache, ConflictExpiredError } from '../../core/sync/conflict-cache';
import { ConflictRestoreWriter } from '../../core/sync/conflict-restore-writer';
import { SyncStatusStore } from '../../core/sync/sync-status-store';
import { Button } from '../../shared/ui/button/button';
import { ConflictCompare } from './conflict-compare';
import { ConflictRestoreDialog } from './conflict-restore-dialog';
import { toConflictRows } from './conflict-rows';

const LOCAL_SAVED = 'Versão restaurada e salva neste dispositivo. Ela será sincronizada automaticamente.';
const SYNCED = 'Versão restaurada e sincronizada.';
@Component({
  imports: [Button, ConflictCompare, ConflictRestoreDialog, RouterLink],
  templateUrl: './conflicts-page.html',
})
export class ConflictsPage {
  protected readonly cache = inject(ConflictCache);
  protected readonly decks = inject(DecksData).active;
  private readonly cards = inject(CardsData);
  private readonly restoreWriter = inject(ConflictRestoreWriter);
  private readonly details = inject(SyncStatusStore).details;
  private readonly injector = inject(Injector);
  private readonly statusMessage = viewChild<ElementRef<HTMLElement>>('statusMessage');
  private readonly restoreButton = viewChild<ElementRef<HTMLButtonElement>>('restoreButton');
  private readonly compareButtons = viewChildren<ElementRef<HTMLButtonElement>>('compareButton');
  private readonly awaitingSync = signal<string | null>(null);
  protected readonly detailId = signal<string | null>(null);
  protected readonly restoringId = signal<string | null>(null);
  protected readonly message = signal('');
  protected readonly rows = computed(() => toConflictRows(this.cache.all(), { cards: this.cards.allActive(), decks: this.decks(), nowIso: new Date().toISOString() }));
  protected readonly selected = computed(() => this.cache.all().find((conflict) => conflict.id === this.detailId()) ?? null);

  constructor() {
    effect(() => {
      this.details();
      const operationId = this.awaitingSync();
      if (operationId !== null) {
        void this.confirmSynced(operationId);
      }
    });
  }

  protected async open(id: string): Promise<void> {
    this.message.set('');
    try {
      await this.cache.loadDetail(id);
      this.detailId.set(id);
    } catch (error) {
      this.message.set(error instanceof ConflictExpiredError ? error.message : 'Não foi possível carregar esta versão agora. Verifique a conexão e tente de novo.');
    }
  }

  protected closeCompare(id: string): void {
    this.detailId.set(null);
    this.restoringId.set(null);
    afterNextRender(() => this.compareButtons().find((button) => button.nativeElement.dataset['conflictId'] === id)?.nativeElement.focus(), { injector: this.injector });
  }

  protected isOrphanCard(): boolean {
    const conflict = this.selected();
    return conflict?.entityType === 'card' && (conflict.deckId === null || !this.cards.allActive().some((card) => card.id === conflict.entityId));
  }

  protected restoreRequested(): void {
    this.restoringId.set(this.selected()?.id ?? null);
  }

  protected restoreClosed(): void {
    this.restoringId.set(null);
    afterNextRender(() => this.restoreButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected async restore(targetDeckId: string | null): Promise<void> {
    const conflict = this.selected();
    if (conflict === null) return;
    try {
      const { operationId } = await this.restoreWriter.execute({ kind: 'conflict_restore', conflictId: conflict.id, targetDeckId });
      this.restoringId.set(null);
      this.showMessage(LOCAL_SAVED);
      this.awaitingSync.set(operationId);
    } catch (error) {
      this.showMessage(error instanceof Error ? error.message : 'Não foi possível restaurar esta versão.');
    }
  }

  private async confirmSynced(operationId: string): Promise<void> {
    if (await this.restoreWriter.isSynced(operationId) && this.awaitingSync() === operationId) {
      this.awaitingSync.set(null);
      this.message.set(SYNCED);
    }
  }

  private showMessage(text: string): void {
    this.message.set(text);
    afterNextRender(() => this.statusMessage()?.nativeElement.focus(), { injector: this.injector });
  }
}
