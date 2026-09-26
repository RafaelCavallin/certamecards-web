import type { Page } from '@playwright/test';

// Dexie envolve as chamadas nativas de IndexedDB em sua própria Promise e converte uma
// DOMException lançada de forma síncrona por put/add em uma rejeição — é assim que o app real
// veria um QuotaExceededError de um navegador sem espaço, então simulamos a mesma exceção síncrona.
function patchIndexedDbForQuota(): void {
  const marker = '__certamecardsQuotaExceeded__';
  const globalWindow = window as unknown as Record<string, boolean>;
  if (globalWindow[marker]) {
    return;
  }
  globalWindow[marker] = true;
  function throwQuotaExceeded(): never {
    throw new DOMException('O dispositivo ficou sem espaço para guardar esta alteração.', 'QuotaExceededError');
  }
  IDBObjectStore.prototype.put = throwQuotaExceeded as typeof IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.add = throwQuotaExceeded as typeof IDBObjectStore.prototype.add;
}
export async function simulateStorageFull(page: Page): Promise<void> {
  await page.evaluate(patchIndexedDbForQuota);
}
