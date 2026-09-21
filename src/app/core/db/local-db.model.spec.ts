import { expect, it } from 'vitest';
import { isDeviceId, isStoredSession } from './local-db.model';

it('TU — isStoredSession aceita uma sessão válida', () => {
  const session = {
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'candidate',
    termsAccepted: true,
  };
  expect(isStoredSession(session)).toBe(true);
});

it('TU — isStoredSession rejeita valores sem os campos esperados', () => {
  expect(isStoredSession({ userId: 'user-1' })).toBe(false);
});

it('TU — isStoredSession rejeita valores que não são objeto', () => {
  expect(isStoredSession('session')).toBe(false);
  expect(isStoredSession(null)).toBe(false);
});

it('TU — isStoredSession rejeita papel fora do domínio conhecido', () => {
  const session = {
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'superadmin',
    termsAccepted: true,
  };
  expect(isStoredSession(session)).toBe(false);
});

it('TU — isDeviceId aceita uma string não vazia', () => {
  expect(isDeviceId('device-1')).toBe(true);
});

it('TU — isDeviceId rejeita string vazia ou valores de outro tipo', () => {
  expect(isDeviceId('')).toBe(false);
  expect(isDeviceId(42)).toBe(false);
});
