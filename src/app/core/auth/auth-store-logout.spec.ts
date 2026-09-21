import { expect, it } from 'vitest';
import { AUTH_RESPONSE, setupAuthStore } from '../../testing/auth-store-harness';

it('TU — logout revoga a sessão remota, limpa o estado local e navega para Entrar', async () => {
  const { store, authApi, router } = setupAuthStore();
  store.setSession(AUTH_RESPONSE);
  await store.logout();
  expect(authApi.logout).toHaveBeenCalled();
  expect(store.user()).toBeNull();
  expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
});

it('TU — logout limpa o estado local mesmo quando a chamada remota falha', async () => {
  const { store, authApi, router } = setupAuthStore();
  authApi.logout.mockRejectedValue(new Error('network'));
  store.setSession(AUTH_RESPONSE);
  await store.logout();
  expect(store.user()).toBeNull();
  expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
});
