import { expect, it } from 'vitest';
import { AUTH_RESPONSE, setupAuthStore } from '../../testing/auth-store-harness';

it('TI-29 — handleUnauthorized faz um único refresh mesmo com chamadas concorrentes', async () => {
  const { store, authApi } = setupAuthStore();
  authApi.refresh.mockResolvedValue(AUTH_RESPONSE);
  const [first, second] = await Promise.all([store.handleUnauthorized(), store.handleUnauthorized()]);
  expect(first).toBe(true);
  expect(second).toBe(true);
  expect(authApi.refresh).toHaveBeenCalledTimes(1);
});

it('TI-29 — handleUnauthorized devolve falso quando o refresh é recusado', async () => {
  const { store, authApi } = setupAuthStore();
  authApi.refresh.mockRejectedValue(new Error('unauthenticated'));
  expect(await store.handleUnauthorized()).toBe(false);
  expect(store.isAuthenticated()).toBe(false);
});
