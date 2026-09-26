import { Component, computed, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { Deck } from '../../core/api/deck.model';
import { Button } from '../../shared/ui/button/button';

@Component({ selector: 'app-conflict-restore-dialog', imports: [Button, FormsModule], templateUrl: './conflict-restore-dialog.html' })
export class ConflictRestoreDialog {
  readonly open = input(false);
  readonly isOrphanCard = input(false);
  readonly decks = input<readonly Deck[]>([]);
  readonly busy = input(false);
  readonly confirmed = output<string | null>();
  readonly closed = output<void>();
  protected readonly options = computed(() => this.decks().filter((deck) => deck.origin === 'own' && deck.deletedAt === null));
  protected targetDeckId = '';

  protected confirm(): void {
    this.confirmed.emit(this.isOrphanCard() ? this.targetDeckId || null : null);
  }
}
