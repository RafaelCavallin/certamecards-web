import { expect, it } from 'vitest';
import { contentUpdateNotice } from './content-update-notice';

it('TU-35 — contentUpdateNotice monta "Atualizado em [data]: [nota]"', () => {
  const notice = contentUpdateNotice({
    contentUpdateNote: 'Lei 14.xxx/2026 alterou o prazo.', contentUpdatedAt: '2026-09-19T14:05:00Z',
  });
  expect(notice).toBe('Atualizado em 19/09/2026: Lei 14.xxx/2026 alterou o prazo.');
});

it('TU-35 — contentUpdateNotice devolve null quando não há nota', () => {
  expect(contentUpdateNotice({ contentUpdateNote: null, contentUpdatedAt: null })).toBeNull();
  expect(contentUpdateNotice({ contentUpdateNote: null, contentUpdatedAt: '2026-09-19T14:05:00Z' })).toBeNull();
  expect(contentUpdateNotice({ contentUpdateNote: 'x', contentUpdatedAt: null })).toBeNull();
});
