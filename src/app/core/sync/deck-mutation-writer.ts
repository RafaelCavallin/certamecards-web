import { Injectable, inject } from '@angular/core';
import type { Deck, UpdateDeckRequest } from '../api/deck.model';
import type { AccountDb } from '../db/account-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { DECK_WRITE_KINDS } from './operation-compactor';
import { enqueueCompactableOperation } from './enqueue-operation';
import { LocalMutationValidationError } from './local-storage-error';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

const DECK_ORIGIN_OWN = 'own';
export interface CreateDeckCommand {
  readonly kind: 'deck_create';
  readonly deckId: string;
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}
export interface UpdateDeckCommand {
  readonly kind: 'deck_update';
  readonly deckId: string;
  readonly changes: UpdateDeckRequest;
}
export interface DeleteDeckCommand {
  readonly kind: 'deck_delete';
  readonly deckId: string;
}
export type DeckMutationCommand = CreateDeckCommand | UpdateDeckCommand | DeleteDeckCommand;
@Injectable({ providedIn: 'root' })
export class DeckMutationWriter implements LocalMutationWriter<DeckMutationCommand, Deck> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: DeckMutationCommand): Promise<Deck> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.decks, context.db.subjects, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.dispatch(context, command));
  }

  private dispatch(context: EnvelopeContext, command: DeckMutationCommand): Promise<Deck> {
    if (command.kind === 'deck_create') {
      return this.create(context, command);
    }
    if (command.kind === 'deck_update') {
      return this.update(context, command);
    }
    return this.delete(context, command);
  }

  private async create(context: EnvelopeContext, command: CreateDeckCommand): Promise<Deck> {
    await this.ensureSubjectActive(context.db, command.subjectId);
    const nowIso = new Date().toISOString();
    const deck: Deck = {
      id: command.deckId,
      subjectId: command.subjectId,
      name: command.name,
      description: command.description,
      origin: DECK_ORIGIN_OWN,
      originRef: null,
      originLabel: null,
      officialStatus: null,
      cardCount: 0,
      contentUpdatedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      deletedAt: null,
      version: 1,
      changeSeq: 0,
    };
    await context.db.decks.put(deck);
    await this.enqueue(context, deck.id, {
      kind: 'deck_create', entityId: deck.id, parentId: null, baseVersion: null,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'deck_create', deck },
    });
    return deck;
  }

  private async update(context: EnvelopeContext, command: UpdateDeckCommand): Promise<Deck> {
    const current = await this.requireOwnDeck(context.db, command.deckId);
    if (command.changes.subjectId !== undefined) {
      await this.ensureSubjectActive(context.db, command.changes.subjectId);
    }
    const deck: Deck = {
      ...current,
      subjectId: command.changes.subjectId ?? current.subjectId,
      name: command.changes.name ?? current.name,
      description: command.changes.description === undefined ? current.description : command.changes.description,
      updatedAt: new Date().toISOString(),
    };
    await context.db.decks.put(deck);
    await this.enqueue(context, deck.id, {
      kind: 'deck_update', entityId: deck.id, parentId: null, baseVersion: current.version,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'deck_update', deck },
    });
    return deck;
  }

  private async delete(context: EnvelopeContext, command: DeleteDeckCommand): Promise<Deck> {
    const current = await this.requireOwnDeck(context.db, command.deckId);
    const deck: Deck = { ...current, deletedAt: new Date().toISOString() };
    await context.db.decks.put(deck);
    await this.enqueue(context, deck.id, {
      kind: 'deck_delete', entityId: deck.id, parentId: null, baseVersion: current.version,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'deck_delete', deckId: deck.id },
    });
    return deck;
  }

  private async enqueue(
    context: EnvelopeContext,
    deckId: string,
    draft: Parameters<typeof buildOperationEnvelope>[1],
  ): Promise<void> {
    const envelope = await buildOperationEnvelope(context, draft);
    await enqueueCompactableOperation(context.db, envelope, DECK_WRITE_KINDS);
    void deckId;
  }

  private async requireOwnDeck(db: AccountDb, deckId: string): Promise<Deck> {
    const deck = await db.decks.get(deckId);
    if (deck === undefined) {
      throw new LocalMutationValidationError('not_found', 'Esse deck não existe mais neste dispositivo.');
    }
    if (deck.deletedAt !== null) {
      throw new LocalMutationValidationError('not_found', 'Esse deck não existe mais neste dispositivo.');
    }
    return deck;
  }

  private async ensureSubjectActive(db: AccountDb, subjectId: string): Promise<void> {
    const subject = await db.subjects.get(subjectId);
    if (!subject?.active) {
      throw new LocalMutationValidationError('subject_inactive', 'Essa matéria não está disponível para uso offline.');
    }
  }
}
