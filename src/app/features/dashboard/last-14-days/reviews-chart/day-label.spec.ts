import { describe, expect, it } from 'vitest';
import { barHeightPercent, dayLabel } from './day-label';

describe('dayLabel', () => {
  it('TU — formata a data no padrão dia e mês abreviado em pt-BR', () => {
    expect(dayLabel('2026-09-17')).toContain('17');
  });
});
describe('barHeightPercent', () => {
  it('TU — devolve altura mínima quando não há revisões na janela', () => {
    expect(barHeightPercent(0, 0)).toBe(4);
  });

  it('TU — devolve 100% para o dia com mais revisões', () => {
    expect(barHeightPercent(10, 10)).toBe(100);
  });

  it('TU — devolve a proporção do dia em relação ao maior valor', () => {
    expect(barHeightPercent(5, 10)).toBe(50);
  });
});
