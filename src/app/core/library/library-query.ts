import { normalizeText } from '../../shared/i18n/normalize-text';
import type { LibraryQuery } from '../api/library.model';

const WHITESPACE_PATTERN = /\s+/g;
export const MAX_QUERY_LENGTH = 120;
export function normalizeLibraryTerm(raw: string): string {
  return normalizeText(raw).replace(WHITESPACE_PATTERN, ' ').slice(0, MAX_QUERY_LENGTH);
}
export function buildLibraryQuery(raw: string, subjectId: string | null, page: number): LibraryQuery {
  return { q: normalizeLibraryTerm(raw), subjectId, page };
}
