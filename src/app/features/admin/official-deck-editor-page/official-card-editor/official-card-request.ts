import type { OfficialStatus } from '../../../../core/api/deck.model';
import type { UpdateOfficialCardRequest } from '../../../../core/api/official-deck.model';
import type { CardFormModel } from '../../../../shared/ui/card-form/card-content-form';
import { NOTE_MAX_LENGTH } from './card-change-impact';
import type { ChangeKind } from './card-change-impact';

export interface ImpactChoice {
  readonly kind: ChangeKind | null;
  readonly note: string;
}
export const EMPTY_CHOICE: ImpactChoice = { kind: null, note: '' };
export function needsImpactChoice(status: OfficialStatus): boolean {
  return status !== 'draft';
}
export function impactError(status: OfficialStatus, choice: ImpactChoice): string | null {
  if (!needsImpactChoice(status)) {
    return null;
  }
  if (choice.kind === null) {
    return 'Escolha entre correção e alteração de conteúdo.';
  }
  if (choice.kind === 'correction') {
    return null;
  }
  if (choice.note.trim() === '') {
    return 'Escreva o que mudou no conteúdo.';
  }
  return choice.note.length > NOTE_MAX_LENGTH ? `Use até ${NOTE_MAX_LENGTH} caracteres.` : null;
}
export function buildUpdateRequest(
  content: CardFormModel,
  status: OfficialStatus,
  choice: ImpactChoice,
): UpdateOfficialCardRequest {
  const base = { front: content.front, back: content.back, source: content.source === '' ? null : content.source };
  if (!needsImpactChoice(status)) {
    return base;
  }
  return choice.kind === 'content'
    ? { ...base, contentChanged: true, note: choice.note.trim() }
    : { ...base, contentChanged: false };
}
