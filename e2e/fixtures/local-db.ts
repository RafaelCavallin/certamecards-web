import type { Page } from '@playwright/test';

const DATABASE_NAME = 'certamecards';
const CARD_STATES_STORE = 'cardStates';
export async function readLocalCardStateDue(page: Page, cardId: string): Promise<string | undefined> {
  return page.evaluate(readDueFromIndexedDb, { databaseName: DATABASE_NAME, storeName: CARD_STATES_STORE, cardId });
}
function readDueFromIndexedDb(args: { databaseName: string; storeName: string; cardId: string }): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(args.databaseName);
    openRequest.onerror = () => reject(new Error(`${args.storeName} open failed: ${String(openRequest.error)}`));
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const getRequest = db.transaction(args.storeName, 'readonly').objectStore(args.storeName).get(args.cardId);
      getRequest.onerror = () => reject(new Error(`${args.storeName} get failed: ${String(getRequest.error)}`));
      getRequest.onsuccess = () => resolve((getRequest.result as { due?: string } | undefined)?.due);
    };
  });
}
