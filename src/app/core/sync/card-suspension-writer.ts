import { Injectable, inject } from '@angular/core';
import type { CardState } from '../api/card-state.model';
import { CurrentAccountDb } from '../db/current-account-db';
import { LocalMutationValidationError } from './local-storage-error';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import { newCardState } from './new-card-state';
import { enqueueCoalescedOperation } from './enqueue-operation';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

export interface CardSuspensionCommand {
  readonly kind: 'card_suspension';
  readonly cardId: string;
  readonly suspended: boolean;
}
@Injectable({ providedIn: 'root' })
export class CardSuspensionWriter implements LocalMutationWriter<CardSuspensionCommand, CardState> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: CardSuspensionCommand): Promise<CardState> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.cards, context.db.cardStates, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.apply(context, command));
  }

  private async apply(context: EnvelopeContext, command: CardSuspensionCommand): Promise<CardState> {
    const card = await context.db.cards.get(command.cardId);
    if (card === undefined) {
      throw new LocalMutationValidationError('not_found', 'Esse cartão não existe mais neste dispositivo.');
    }
    if (card.deletedAt !== null) {
      throw new LocalMutationValidationError('not_found', 'Esse cartão não existe mais neste dispositivo.');
    }
    const previous = await context.db.cardStates.get(command.cardId);
    const state: CardState = { ...(previous ?? newCardState(command.cardId, previous)), suspended: command.suspended };
    await context.db.cardStates.put(state);
    const envelope = await buildOperationEnvelope(context, {
      kind: 'card_suspension', entityId: command.cardId, parentId: card.deckId, baseVersion: null,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'card_suspension', cardId: command.cardId, suspended: command.suspended },
    });
    await enqueueCoalescedOperation(context.db, envelope);
    return state;
  }
}
