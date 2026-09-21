import { describe, expect, it } from 'vitest';
import { parseFragmentToken } from './fragment-token';

describe('parseFragmentToken', () => {
  it('TU — extrai o valor do parâmetro do fragmento da URL', () => {
    expect(parseFragmentToken('token=abc123', 'token')).toBe('abc123');
  });

  it('TU — devolve string vazia quando o fragmento é nulo', () => {
    expect(parseFragmentToken(null, 'token')).toBe('');
  });

  it('TU — devolve string vazia quando o parâmetro não existe no fragmento', () => {
    expect(parseFragmentToken('reauth=xyz', 'token')).toBe('');
  });
});
