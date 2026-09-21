import type { Card } from '../api/card.model';
import { normalizeText } from '../../shared/i18n/normalize-text';
import type { CardRow } from './local-db.model';

export function toCardRow(card: Card): CardRow {
  const searchText = normalizeText(`${card.front} ${card.back} ${card.source ?? ''}`);
  return { ...card, searchText };
}
