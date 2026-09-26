import { expect, it } from 'vitest';
import { AUTH_RESPONSE, AUTH_USER, setupAuthStore } from '../../testing/auth-store-harness';

it('TU — setSession grava a sessão localmente e marca o usuário como autenticado', async () => {
  const { store, bootstrapDb } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  expect(bootstrapDb.session).toEqual({
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'candidate',
    termsAccepted: true,
  });
  expect(store.isAuthenticated()).toBe(true);
});

it('TU — isAdmin reflete o papel do usuário autenticado', async () => {
  const { store } = setupAuthStore();
  await store.setSession({ ...AUTH_RESPONSE, user: { ...AUTH_USER, role: 'admin' } });
  expect(store.isAdmin()).toBe(true);
});

it('TU — updateUser atualiza o usuário sem passar pelo servidor', async () => {
  const { store, bootstrapDb } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  store.updateUser({ ...AUTH_USER, displayName: 'Ana Paula' });
  expect(store.user()?.displayName).toBe('Ana Paula');
  await Promise.resolve();
  expect(bootstrapDb.session?.displayName).toBe('Ana Paula');
});

it('TU-78 — setSession ativa o AccountDb da conta que acabou de autenticar', async () => {
  const { store, accountActivator } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  expect(accountActivator.reauthenticate).toHaveBeenCalledWith('user-1');
});
