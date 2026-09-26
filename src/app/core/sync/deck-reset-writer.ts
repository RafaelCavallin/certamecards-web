import { Injectable, inject } from '@angular/core';
import { CurrentAccountDb } from '../db/current-account-db';
import type { AccountDb } from '../db/account-db';
import { LocalMutationValidationError } from './local-storage-error';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import { newCardState } from './new-card-state';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

export interface DeckResetCommand {
  readonly kind: 'deck_reset';
  readonly deckId: string;
}
export interface DeckResetResult {
  readonly deckId: string;
  readonly resetCards: number;
}
@Injectable({ providedIn: 'root' })
export class DeckResetWriter implements LocalMutationWriter<DeckResetCommand, DeckResetResult> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: DeckResetCommand): Promise<DeckResetResult> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.decks, context.db.cards, context.db.cardStates, context.db.deckResets, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.apply(context, command));
  }

  private async apply(context: EnvelopeContext, command: DeckResetCommand): Promise<DeckResetResult> {
    const deck = await context.db.decks.get(command.deckId);
    if (deck?.deletedAt !== null) {
      throw new LocalMutationValidationError('not_found', 'Esse deck não existe mais neste dispositivo.');
    }
    const cards = await context.db.cards.where('deckId').equals(command.deckId).filter((card) => card.deletedAt === null).toArray();
    for (const card of cards) {
      await this.resetOne(context.db, card.id);
    }
    const envelope = await buildOperationEnvelope(context, {
      kind: 'deck_reset', entityId: command.deckId, parentId: null, baseVersion: null,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'deck_reset', deckId: command.deckId },
    });
    await context.db.deckResets.put({ operationId: envelope.operationId, deckId: command.deckId, eventAt: envelope.occurredAt });
    await context.db.syncOperations.add(envelope);
    return { deckId: command.deckId, resetCards: cards.length };
  }

  private async resetOne(db: AccountDb, cardId: string): Promise<void> {
    const previous = await db.cardStates.get(cardId);
    await db.cardStates.put(newCardState(cardId, previous));
  }
}
