import { HttpErrorResponse } from '@angular/common/http';
import { expect, it } from 'vitest';
import { AUTH_RESPONSE, AUTH_USER, setupAuthStore } from '../../testing/auth-store-harness';

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

it('TU-78 — refresh com falha de rede preserva a sessão local', async () => {
  const { store, authApi, bootstrapDb } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  authApi.refresh.mockRejectedValue(new HttpErrorResponse({ status: 0 }));
  expect(await store.refresh()).toBe(false);
  expect(store.user()).toEqual(AUTH_USER);
  expect(bootstrapDb.session).not.toBeNull();
});

it('TU-78 — refresh com 401 confirmado pausa a conta em auth_required', async () => {
  const { store, authApi, bootstrapDb, accountDbResolver } = setupAuthStore();
  await store.setSession(AUTH_RESPONSE);
  authApi.refresh.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
  expect(await store.refresh()).toBe(false);
  expect(store.user()).toBeNull();
  expect(store.isAuthenticated()).toBe(false);
  expect(bootstrapDb.session).toBeNull();
  expect(accountDbResolver.block).toHaveBeenCalledWith('user-1');
});
