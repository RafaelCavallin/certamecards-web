import { describe, expect, it } from 'vitest';
import { toAuthUser, toStoredSession } from './session-mapper';

describe('toAuthUser', () => {
  it('TU — converte uma sessão guardada em usuário autenticado', () => {
    const session = {
      userId: 'user-1',
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'admin' as const,
      termsAccepted: true,
    };
    expect(toAuthUser(session)).toEqual({
      id: 'user-1',
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'admin',
      termsAccepted: true,
    });
  });
});

describe('toStoredSession', () => {
  it('TU — converte um usuário autenticado em sessão a guardar', () => {
    const user = {
      id: 'user-1',
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'candidate' as const,
      termsAccepted: false,
    };
    expect(toStoredSession(user)).toEqual({
      userId: 'user-1',
      email: 'ana@exemplo.com',
      displayName: 'Ana',
      role: 'candidate',
      termsAccepted: false,
    });
  });
});
