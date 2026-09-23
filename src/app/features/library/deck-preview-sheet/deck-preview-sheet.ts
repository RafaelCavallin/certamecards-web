import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { LibraryApi } from '../../../core/api/library-api';
import type { Deck } from '../../../core/api/deck.model';
import type { DeckPreview } from '../../../core/api/library.model';
import { ConnectivityStore } from '../../../core/connectivity/connectivity-store';
import { generateUuidV7 } from '../../../core/db/uuid7';
import { DUPLICATE_TEXTS, type DuplicateChoice } from '../../../core/library/duplicate-options';
import { LibraryEvents } from '../../../core/library/library-events';
import { libraryErrorMessage } from '../../../core/library/library-messages';
import { SubscriptionService } from '../../../core/library/subscription-service';
import { cardsLabel } from '../../../shared/i18n/plural';
import { Button } from '../../../shared/ui/button/button';
import { OfflineNotice } from '../../../shared/ui/offline-notice/offline-notice';
import { DuplicateDeckDialog } from '../../../shared/ui/duplicate-deck-dialog/duplicate-deck-dialog';
import { Sheet } from '../../../shared/ui/sheet/sheet';
import { Tag } from '../../../shared/ui/tag/tag';
import { PreviewCardList } from '../preview-card-list/preview-card-list';

@Component({
  selector: 'app-deck-preview-sheet',
  imports: [Button, OfflineNotice, Sheet, Tag, PreviewCardList, DuplicateDeckDialog],
  templateUrl: './deck-preview-sheet.html',
})
export class DeckPreviewSheet {
  private readonly api = inject(LibraryApi);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly events = inject(LibraryEvents);
  protected readonly online = inject(ConnectivityStore).online;
  protected readonly cardsLabel = cardsLabel;
  protected readonly texts = DUPLICATE_TEXTS;
  readonly deckId = input<string | null>(null);
  readonly closed = output<void>();
  readonly opened = output<string>();
  protected readonly preview = signal<DeckPreview | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly duplicating = signal(false);

  constructor() {
    effect(() => {
      const deckId = this.deckId();
      const online = this.online();
      untracked(() => void this.load(deckId, online));
    });
  }

  protected title(): string {
    return this.preview()?.deck.name ?? 'Prévia do deck';
  }

  protected onSubscribe(deckId: string): Promise<void> {
    return this.run(() => this.subscriptions.subscribe(deckId));
  }

  protected onDuplicate(deckId: string, choice: DuplicateChoice): Promise<void> {
    return this.run(async () => {
      const copy = await this.subscriptions.duplicate(deckId, generateUuidV7(), choice);
      this.duplicating.set(false);
      return copy;
    });
  }

  protected onOpenDeck(deckId: string): void {
    this.opened.emit(deckId);
  }

  protected onDuplicateCanceled(): void {
    this.duplicating.set(false);
    this.errorMessage.set(null);
  }

  private async run(action: () => Promise<Deck>): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      this.opened.emit((await action()).id);
    } catch (error) {
      this.errorMessage.set(libraryErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  private async load(deckId: string | null, online: boolean): Promise<void> {
    this.preview.set(null);
    this.loadFailed.set(false);
    this.errorMessage.set(null);
    if (deckId === null || !online) {
      return;
    }
    try {
      this.preview.set(await this.api.preview(deckId));
      this.events.previewOpened(deckId);
    } catch {
      this.loadFailed.set(true);
    }
  }
}
