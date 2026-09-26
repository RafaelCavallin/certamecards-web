import type { AccountDb } from '../db/account-db';
import type { SyncOperationRow } from '../db/account-db.model';
import type { SyncOperationKind } from './sync-operation.model';
import type { SyncOperationPayload } from './sync-operation-payload.model';

export interface OperationDescription {
  readonly kindLabel: string;
  readonly subject: string | null;
  readonly copyText: string | null;
}
const KIND_LABELS: Readonly<Record<SyncOperationKind, string>> = {
  deck_create: 'Criar deck',
  deck_update: 'Editar deck',
  deck_delete: 'Excluir deck',
  card_create: 'Criar cartão',
  card_update: 'Editar cartão',
  card_delete: 'Excluir cartão',
  card_suspension: 'Suspender ou reativar cartão',
  deck_reset: 'Zerar progresso',
  settings_patch: 'Alterar ajustes',
  profile_patch: 'Alterar nome de exibição',
  conflict_restore: 'Restaurar versão guardada',
};
type Operation = SyncOperationRow<SyncOperationPayload>;
function nonEmpty(value: string | null): string | null {
  return value === null || value.length === 0 ? null : value;
}
function joinText(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join('\n\n');
}
function snapshotText(snapshot: unknown): { readonly subject: string | null; readonly copyText: string | null } {
  if (typeof snapshot !== 'object' || snapshot === null) {
    return { subject: null, copyText: null };
  }
  const record = snapshot as Readonly<Record<string, unknown>>;
  const texts = ['front', 'back', 'name', 'description', 'source'].map((key) => record[key]).filter((value): value is string => typeof value === 'string');
  const subject = typeof record['front'] === 'string' ? record['front'] : record['name'];
  return { subject: typeof subject === 'string' ? subject : null, copyText: nonEmpty(joinText(texts)) };
}
function authoredText(payload: SyncOperationPayload): { readonly subject: string | null; readonly copyText: string | null } | null {
  if (payload.kind === 'card_create' || payload.kind === 'card_update') {
    return { subject: payload.card.front, copyText: joinText([payload.card.front, payload.card.back, payload.card.source]) };
  }
  if (payload.kind === 'deck_create' || payload.kind === 'deck_update') {
    return { subject: payload.deck.name, copyText: joinText([payload.deck.name, payload.deck.description]) };
  }
  if (payload.kind === 'conflict_restore') {
    return snapshotText(payload.snapshot);
  }
  return null;
}
async function localSubject(db: AccountDb, entityId: string): Promise<string | null> {
  const card = await db.cards.get(entityId);
  if (card !== undefined) {
    return card.front;
  }
  return (await db.decks.get(entityId))?.name ?? null;
}
export async function describeOperation(db: AccountDb, operation: Operation): Promise<OperationDescription> {
  const kindLabel = KIND_LABELS[operation.kind];
  const authored = authoredText(operation.payload);
  if (authored !== null) {
    return { kindLabel, subject: nonEmpty(authored.subject), copyText: nonEmpty(authored.copyText) };
  }
  return { kindLabel, subject: await localSubject(db, operation.entityId), copyText: null };
}
