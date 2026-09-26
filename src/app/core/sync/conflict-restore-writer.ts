import { Injectable, inject } from '@angular/core';
import type { Card } from '../api/card.model';
import type { Deck } from '../api/deck.model';
import { toCardRow } from '../db/card-row';
import type { AccountDb } from '../db/account-db';
import type { ConflictCacheRow } from '../db/account-db.model';
import { CurrentAccountDb } from '../db/current-account-db';
import { isConflictExpired } from './conflict-expiry';
import { LocalMutationValidationError } from './local-storage-error';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

const CARD_TYPE_BASIC = 'basic';
export interface ConflictRestoreCommand {
  readonly kind: 'conflict_restore';
  readonly conflictId: string;
  readonly targetDeckId: string | null;
}
export interface ConflictRestoreResult {
  readonly entityType: string;
  readonly entityId: string;
  readonly operationId: string;
}
interface DeckSnapshot {
  readonly subjectId: string;
  readonly name: string;
  readonly description: string | null;
}
interface CardSnapshot {
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
}
function isDeckSnapshot(value: unknown): value is DeckSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['subjectId'] === 'string' && typeof record['name'] === 'string';
}
function isCardSnapshot(value: unknown): value is CardSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record['front'] === 'string' && typeof record['back'] === 'string';
}
@Injectable({ providedIn: 'root' })
export class ConflictRestoreWriter implements LocalMutationWriter<ConflictRestoreCommand, ConflictRestoreResult> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: ConflictRestoreCommand): Promise<ConflictRestoreResult> {
    const account = this.currentAccountDb.require();
    const conflict = await this.requireRestorableConflict(account.db, command.conflictId);
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.decks, context.db.cards, context.db.cardStates, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.apply(context, command, conflict));
  }

  private async requireRestorableConflict(db: AccountDb, conflictId: string): Promise<ConflictCacheRow> {
    const conflict = await db.conflicts.get(conflictId);
    if (conflict === undefined) {
      throw new LocalMutationValidationError('not_found', 'Esse conflito não existe mais neste dispositivo.');
    }
    if (isConflictExpired(conflict, new Date().toISOString())) {
      throw new LocalMutationValidationError('conflict_expired', 'O prazo de 30 dias para restaurar esse conflito já passou.');
    }
    if (conflict.detail === null) {
      throw new LocalMutationValidationError('conflict_not_cached', 'Abra os detalhes desse conflito com internet antes de restaurar offline.');
    }
    return conflict;
  }

  private apply(context: EnvelopeContext, command: ConflictRestoreCommand, conflict: ConflictCacheRow): Promise<ConflictRestoreResult> {
    if (conflict.entityType === 'deck') {
      return this.restoreDeck(context, command, conflict);
    }
    return this.restoreCard(context, command, conflict);
  }

  private async restoreDeck(
    context: EnvelopeContext,
    command: ConflictRestoreCommand,
    conflict: ConflictCacheRow,
  ): Promise<ConflictRestoreResult> {
    const snapshot = conflict.detail?.losingSnapshot;
    if (!isDeckSnapshot(snapshot)) {
      throw new LocalMutationValidationError('validation_failed', 'A versão salva desse deck não pôde ser lida.');
    }
    const nowIso = new Date().toISOString();
    const deck: Deck = {
      id: conflict.entityId, subjectId: snapshot.subjectId, name: snapshot.name, description: snapshot.description,
      origin: 'own', originRef: null, originLabel: null, officialStatus: null, cardCount: 0, contentUpdatedAt: null,
      createdAt: nowIso, updatedAt: nowIso, deletedAt: null, version: 1, changeSeq: 0,
    };
    await context.db.decks.put(deck);
    const operationId = await this.enqueue(context, {
      kind: 'conflict_restore', entityId: deck.id, parentId: null, baseVersion: null, predecessorOperationId: null,
      dependsOn: [],
      payload: {
        kind: 'conflict_restore', conflictId: command.conflictId,
        snapshot: { subjectId: snapshot.subjectId, name: snapshot.name, description: snapshot.description },
        targetDeckId: null,
      },
    });
    return { entityType: 'deck', entityId: deck.id, operationId };
  }

  private async restoreCard(
    context: EnvelopeContext,
    command: ConflictRestoreCommand,
    conflict: ConflictCacheRow,
  ): Promise<ConflictRestoreResult> {
    const snapshot = conflict.detail?.losingSnapshot;
    if (!isCardSnapshot(snapshot)) {
      throw new LocalMutationValidationError('validation_failed', 'A versão salva desse cartão não pôde ser lida.');
    }
    const targetDeckId = command.targetDeckId ?? conflict.deckId;
    if (targetDeckId === null) {
      throw new LocalMutationValidationError('target_deck_required', 'Escolha um deck próprio para restaurar esse cartão.');
    }
    await this.requireOwnActiveDeck(context.db, targetDeckId);
    const nowIso = new Date().toISOString();
    const card: Card = {
      id: conflict.entityId, deckId: targetDeckId, type: CARD_TYPE_BASIC, front: snapshot.front, back: snapshot.back,
      source: snapshot.source, createdAt: nowIso, updatedAt: nowIso, deletedAt: null, version: 1, changeSeq: 0,
    };
    await context.db.cards.put(toCardRow(card));
    const operationId = await this.enqueue(context, {
      kind: 'conflict_restore', entityId: card.id, parentId: targetDeckId, baseVersion: null, predecessorOperationId: null,
      dependsOn: [],
      payload: {
        kind: 'conflict_restore', conflictId: command.conflictId,
        snapshot: { front: snapshot.front, back: snapshot.back, source: snapshot.source, parentBaseVersion: null },
        targetDeckId,
      },
    });
    return { entityType: 'card', entityId: card.id, operationId };
  }

  async isSynced(operationId: string): Promise<boolean> {
    const operation = await this.currentAccountDb.require().db.syncOperations.get(operationId);
    return operation === undefined || operation.status === 'synced';
  }

  private async requireOwnActiveDeck(db: AccountDb, deckId: string): Promise<void> {
    const deck = await db.decks.get(deckId);
    if (deck?.deletedAt !== null) {
      throw new LocalMutationValidationError('target_deck_required', 'Esse deck não existe mais neste dispositivo.');
    }
  }

  private async enqueue(context: EnvelopeContext, draft: Parameters<typeof buildOperationEnvelope>[1]): Promise<string> {
    const envelope = await buildOperationEnvelope(context, draft);
    await context.db.syncOperations.add(envelope);
    return envelope.operationId;
  }
}
