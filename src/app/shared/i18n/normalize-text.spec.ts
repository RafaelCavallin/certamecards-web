import { expect, it } from 'vitest';
import { normalizeText } from './normalize-text';

it('TU-20 — normaliza maiúsculas e acentos para o mesmo valor', () => {
  expect(normalizeText('MANDADO')).toBe(normalizeText('mândado'));
});

it('TU-20 — remove espaços das pontas', () => {
  expect(normalizeText('  Direito Constitucional  ')).toBe('direito constitucional');
});
