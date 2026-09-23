import { expect, it } from 'vitest';
import { toQueryParams } from './query-params';

it('TU — toQueryParams descarta null e string vazia e mantém zero', () => {
  expect(toQueryParams({ a: null, b: '', c: 'x', d: 0 })).toEqual({ c: 'x', d: 0 });
});
