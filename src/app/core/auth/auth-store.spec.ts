import { expect, it } from 'vitest';
import { AUTH_RESPONSE, AUTH_USER, setOnline, setupAuthStore } from '../../testing/auth-store-harness';

it('TU — initialize com rede aplica a sessão devolvida pelo refresh', async () => {
  const { store, authApi } = setupAuthStore();
  setOnline(true);
  authApi.refresh.mockResolvedValue(AUTH_RESPONSE);
  await store.initialize();
  expect(store.user()).toEqual(AUTH_USER);
  expect(store.accessToken()).toBe('token-1');
  expect(store.initializing()).toBe(false);
});

it('TU — initialize com rede e refresh recusado deixa o usuário deslogado', async () => {
  const { store, authApi } = setupAuthStore();
  setOnline(true);
  authApi.refresh.mockRejectedValue(new Error('unauthenticated'));
  await store.initialize();
  expect(store.user()).toBeNull();
  expect(store.isAuthenticated()).toBe(false);
});

it('TU — initialize sem rede carrega a sessão guardada localmente', async () => {
  const { store, authApi, localDb } = setupAuthStore();
  setOnline(false);
  await localDb.setSession({
    userId: 'user-1',
    email: 'ana@exemplo.com',
    displayName: 'Ana',
    role: 'candidate',
    termsAccepted: true,
  });
  await store.initialize();
  expect(store.user()).toEqual(AUTH_USER);
  expect(authApi.refresh).not.toHaveBeenCalled();
});

it('TU — initialize sem rede e sem sessão local mantém o usuário deslogado', async () => {
  const { store } = setupAuthStore();
  setOnline(false);
  await store.initialize();
  expect(store.user()).toBeNull();
});
