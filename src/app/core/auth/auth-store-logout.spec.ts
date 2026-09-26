import { expect, it, vi } from 'vitest';
import { AUTH_RESPONSE, setupAuthStore } from '../../testing/auth-store-harness';

it('TU-79 — logout revoga a sessão remota, limpa o estado local e navega para Entrar', async () => {
  const { store, authApi, router } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  await store.logout();
  expect(authApi.logout).toHaveBeenCalled();
  expect(store.user()).toBeNull();
  expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
});

it('TU-79 — sem pendências, a saída concluída apaga o AccountDb local', async () => {
  const { store, currentAccountDb } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  const deleteAccountDb = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  currentAccountDb.set({ db: { delete: deleteAccountDb } });
  await store.logout();
  expect(deleteAccountDb).toHaveBeenCalledOnce();
});

it('TU-79 — falha no logout remoto mantém sessão e dados locais recuperáveis', async () => {
  const { store, authApi, router, bootstrapDb } = setupAuthStore();
  authApi.logout.mockRejectedValue(new Error('network'));
  await store.setSession(AUTH_RESPONSE);
  await expect(store.logout()).rejects.toThrow('network');
  expect(store.user()).not.toBeNull();
  expect(bootstrapDb.session).not.toBeNull();
  expect(router.navigate).not.toHaveBeenCalled();
});
