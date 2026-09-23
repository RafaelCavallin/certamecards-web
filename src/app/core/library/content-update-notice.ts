import type { CardState } from '../api/card-state.model';
import { formatDatePtBr } from '../../shared/i18n/format-date';

export function contentUpdateNotice(state: Pick<CardState, 'contentUpdateNote' | 'contentUpdatedAt'>): string | null {
  const { contentUpdateNote, contentUpdatedAt } = state;
  if (contentUpdateNote === null || contentUpdatedAt === null) {
    return null;
  }
  return `Atualizado em ${formatDatePtBr(contentUpdatedAt)}: ${contentUpdateNote}`;
}
