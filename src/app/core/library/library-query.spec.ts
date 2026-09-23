import { expect, it } from 'vitest';
import { buildLibraryQuery, MAX_QUERY_LENGTH, normalizeLibraryTerm } from './library-query';

it('TU-37 — "Crase", "CRASE" e "crasé" produzem a mesma consulta', () => {
  const terms = ['Crase', 'CRASE', 'crasé'];
  const queries = terms.map((term) => buildLibraryQuery(term, null, 0));
  expect(new Set(queries.map((query) => query.q))).toEqual(new Set(['crase']));
});

it('TU-37 — espaços são colapsados e as pontas aparadas', () => {
  expect(normalizeLibraryTerm('  regência   e  concordância ')).toBe('regencia e concordancia');
});

it('TU-37 — consulta em branco vira q vazio, que o cliente HTTP não envia', () => {
  expect(buildLibraryQuery('   ', null, 0).q).toBe('');
});

it('TU-37 — termo longo demais é truncado no limite do servidor', () => {
  expect(normalizeLibraryTerm('a'.repeat(MAX_QUERY_LENGTH + 20))).toHaveLength(MAX_QUERY_LENGTH);
});

it('TU-37 — matéria e página seguem na consulta', () => {
  expect(buildLibraryQuery('x', 's1', 2)).toEqual({ q: 'x', subjectId: 's1', page: 2 });
});
