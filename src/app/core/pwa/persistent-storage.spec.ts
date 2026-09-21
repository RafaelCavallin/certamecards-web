import { afterEach, expect, it, vi } from 'vitest';
import { requestPersistentStorage } from './persistent-storage';

const originalStorage = navigator.storage;

afterEach(() => {
  Object.defineProperty(navigator, 'storage', { value: originalStorage, configurable: true });
});

it('TU — chama navigator.storage.persist() e devolve o resultado', async () => {
  const persist = vi.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
  await expect(requestPersistentStorage()).resolves.toBe(true);
  expect(persist).toHaveBeenCalledOnce();
});

it('TU — devolve false quando o navegador não suporta storage.persist', async () => {
  Object.defineProperty(navigator, 'storage', { value: {}, configurable: true });
  await expect(requestPersistentStorage()).resolves.toBe(false);
});

it('TU — devolve false quando persist() rejeita', async () => {
  const persist = vi.fn().mockRejectedValue(new Error('não suportado'));
  Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
  await expect(requestPersistentStorage()).resolves.toBe(false);
});
