import { Injectable, inject } from '@angular/core';
import type { Card, UpdateCardRequest } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { toCardRow } from '../db/card-row';
import { CurrentAccountDb } from '../db/current-account-db';
import type { AccountDb } from '../db/account-db';
import type { CardRow } from '../db/local-db.model';
import { CardLimitPolicy } from './card-limit-policy';
import { CARD_WRITE_KINDS } from './operation-compactor';
import { enqueueCompactableOperation } from './enqueue-operation';
import { LocalMutationValidationError } from './local-storage-error';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

export interface CreateCardCommand {
  readonly kind: 'card_create';
  readonly deckId: string;
  readonly cardId: string;
  readonly type: string;
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
}
export interface UpdateCardCommand {
  readonly kind: 'card_update';
  readonly cardId: string;
  readonly changes: UpdateCardRequest;
}
export interface DeleteCardCommand {
  readonly kind: 'card_delete';
  readonly cardId: string;
}
export type CardMutationCommand = CreateCardCommand | UpdateCardCommand | DeleteCardCommand;
@Injectable({ providedIn: 'root' })
export class CardMutationWriter implements LocalMutationWriter<CardMutationCommand, Card> {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly limitPolicy = inject(CardLimitPolicy);

  async execute(command: CardMutationCommand): Promise<Card> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.cards, context.db.decks, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.dispatch(context, command));
  }

  private dispatch(context: EnvelopeContext, command: CardMutationCommand): Promise<Card> {
    if (command.kind === 'card_create') {
      return this.create(context, command);
    }
    if (command.kind === 'card_update') {
      return this.update(context, command);
    }
    return this.delete(context, command);
  }

  private async create(context: EnvelopeContext, command: CreateCardCommand): Promise<Card> {
    const deck = await this.requireOwnDeck(context.db, command.deckId);
    await this.ensureWithinLimits(context.db, deck.id);
    const nowIso = new Date().toISOString();
    const card: Card = {
      id: command.cardId,
      deckId: deck.id,
      type: command.type,
      front: command.front,
      back: command.back,
      source: command.source,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
      version: 1,
      changeSeq: 0,
    };
    await context.db.cards.put(toCardRow(card));
    await this.enqueue(context, {
      kind: 'card_create', entityId: card.id, parentId: deck.id, baseVersion: null,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'card_create', card },
    });
    return card;
  }

  private async update(context: EnvelopeContext, command: UpdateCardCommand): Promise<Card> {
    const current = await this.requireOwnCard(context.db, command.cardId);
    const card: Card = {
      ...current,
      front: command.changes.front ?? current.front,
      back: command.changes.back ?? current.back,
      source: command.changes.source === undefined ? current.source : command.changes.source,
      updatedAt: new Date().toISOString(),
    };
    await context.db.cards.put(toCardRow(card));
    await this.enqueue(context, {
      kind: 'card_update', entityId: card.id, parentId: card.deckId, baseVersion: current.version,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'card_update', card },
    });
    return card;
  }

  private async delete(context: EnvelopeContext, command: DeleteCardCommand): Promise<Card> {
    const current = await this.requireOwnCard(context.db, command.cardId);
    const card: Card = { ...current, deletedAt: new Date().toISOString() };
    await context.db.cards.put(toCardRow(card));
    await this.enqueue(context, {
      kind: 'card_delete', entityId: card.id, parentId: card.deckId, baseVersion: current.version,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'card_delete', cardId: card.id },
    });
    return card;
  }

  private async enqueue(context: EnvelopeContext, draft: Parameters<typeof buildOperationEnvelope>[1]): Promise<void> {
    const envelope = await buildOperationEnvelope(context, draft);
    await enqueueCompactableOperation(context.db, envelope, CARD_WRITE_KINDS);
  }

  private async requireOwnDeck(db: AccountDb, deckId: string): Promise<Deck> {
    const deck = await db.decks.get(deckId);
    if (deck === undefined) {
      throw new LocalMutationValidationError('parent_deleted', 'Esse deck não existe mais neste dispositivo.');
    }
    if (deck.deletedAt !== null) {
      throw new LocalMutationValidationError('parent_deleted', 'Esse deck não existe mais neste dispositivo.');
    }
    return deck;
  }

  private async requireOwnCard(db: AccountDb, cardId: string): Promise<CardRow> {
    const card = await db.cards.get(cardId);
    if (card === undefined) {
      throw new LocalMutationValidationError('not_found', 'Esse cartão não existe mais neste dispositivo.');
    }
    if (card.deletedAt !== null) {
      throw new LocalMutationValidationError('not_found', 'Esse cartão não existe mais neste dispositivo.');
    }
    return card;
  }

  private async ensureWithinLimits(db: AccountDb, deckId: string): Promise<void> {
    const deckCount = await this.countActive(db, deckId);
    const userCount = await db.cards.filter((card) => card.deletedAt === null).count();
    const violation = this.limitPolicy.violation(deckCount, userCount);
    if (violation === 'deck_card_limit') {
      throw new LocalMutationValidationError('deck_card_limit', 'Esse deck já tem o máximo de 5.000 cartões.');
    }
    if (violation === 'user_card_limit') {
      throw new LocalMutationValidationError('user_card_limit', 'Sua conta já tem o máximo de 50.000 cartões.');
    }
  }

  private countActive(db: AccountDb, deckId: string): Promise<number> {
    return db.cards.where('deckId').equals(deckId).filter((card) => card.deletedAt === null).count();
  }
}
