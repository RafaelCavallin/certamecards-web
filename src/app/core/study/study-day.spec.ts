import { expect, it } from 'vitest';
import { studyDayBounds } from './study-day';

it('TU-07 — 01:30 em São Paulo pertence ao dia de estudo anterior', () => {
  const now = new Date('2026-09-18T04:30:00Z');
  const bounds = studyDayBounds(now, 'America/Sao_Paulo');
  expect(bounds.key).toBe('2026-09-17');
});

it('TU-07 — 04:00 em São Paulo já pertence ao novo dia de estudo', () => {
  const now = new Date('2026-09-18T07:00:00Z');
  const bounds = studyDayBounds(now, 'America/Sao_Paulo');
  expect(bounds.key).toBe('2026-09-18');
  expect(bounds.start.toISOString()).toBe('2026-09-18T07:00:00.000Z');
  expect(bounds.end.toISOString()).toBe('2026-09-19T07:00:00.000Z');
});

it('TU-08 — America/Manaus desloca as bordas em 1 hora em relação a São Paulo', () => {
  const now = new Date('2026-09-18T18:00:00Z');
  const saoPaulo = studyDayBounds(now, 'America/Sao_Paulo');
  const manaus = studyDayBounds(now, 'America/Manaus');
  expect(manaus.start.getTime() - saoPaulo.start.getTime()).toBe(3_600_000);
});
