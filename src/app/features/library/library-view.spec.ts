import { expect, it } from 'vitest';
import { aPage, aSummary } from './library-test-support';
import { resolveLibraryView } from './library-view';

const BASE = { online: true, failed: false, filtering: false, result: null };

it('TU — offline vence qualquer outro estado', () => {
  expect(resolveLibraryView({ ...BASE, online: false, failed: true })).toBe('offline');
});

it('TU — falha, carregando, pronto, sem resultados e biblioteca vazia', () => {
  expect(resolveLibraryView({ ...BASE, failed: true })).toBe('error');
  expect(resolveLibraryView(BASE)).toBe('loading');
  expect(resolveLibraryView({ ...BASE, result: aPage([aSummary()]) })).toBe('ready');
  expect(resolveLibraryView({ ...BASE, result: aPage([]), filtering: true })).toBe('no-results');
  expect(resolveLibraryView({ ...BASE, result: aPage([]) })).toBe('empty-library');
});
