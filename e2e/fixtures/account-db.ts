import type { Page } from '@playwright/test';

const BOOTSTRAP_DATABASE_NAME = 'certamecards';
interface OpenArgs {
  readonly databaseName: string;
  readonly storeName: string;
}
function readActiveAccountUserId(databaseName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(databaseName);
    openRequest.onerror = () => reject(new Error(`meta open failed: ${String(openRequest.error)}`));
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const getRequest = db.transaction('meta', 'readonly').objectStore('meta').get('activeAccountId');
      getRequest.onerror = () => reject(new Error(`meta get failed: ${String(getRequest.error)}`));
      getRequest.onsuccess = () => resolve((getRequest.result as { value?: string } | undefined)?.value ?? '');
    };
  });
}
export async function activeAccountUserId(page: Page): Promise<string> {
  return page.evaluate(readActiveAccountUserId, BOOTSTRAP_DATABASE_NAME);
}
export async function accountDatabaseName(page: Page): Promise<string> {
  const userId = await activeAccountUserId(page);
  return `certamecards-account-${userId}`;
}
function readAll(args: OpenArgs): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(args.databaseName);
    openRequest.onerror = () => reject(new Error(`${args.storeName} open failed: ${String(openRequest.error)}`));
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const getAllRequest = db.transaction(args.storeName, 'readonly').objectStore(args.storeName).getAll();
      getAllRequest.onerror = () => reject(new Error(`${args.storeName} getAll failed: ${String(getAllRequest.error)}`));
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
    };
  });
}
export async function allAccountRecords<T>(page: Page, storeName: string): Promise<T[]> {
  const databaseName = await accountDatabaseName(page);
  return page.evaluate(readAll, { databaseName, storeName }) as Promise<T[]>;
}
function writeRecord(args: OpenArgs & { record: unknown }): Promise<void> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(args.databaseName);
    openRequest.onerror = () => reject(new Error(`${args.storeName} open failed: ${String(openRequest.error)}`));
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const tx = db.transaction(args.storeName, 'readwrite');
      tx.objectStore(args.storeName).put(args.record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error(`${args.storeName} put failed: ${String(tx.error)}`));
    };
  });
}
export async function putAccountRecord(page: Page, storeName: string, record: unknown): Promise<void> {
  const databaseName = await accountDatabaseName(page);
  await page.evaluate(writeRecord, { databaseName, storeName, record });
}
function countRecords(args: OpenArgs): Promise<number> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(args.databaseName);
    openRequest.onerror = () => reject(new Error(`${args.storeName} open failed: ${String(openRequest.error)}`));
    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const countRequest = db.transaction(args.storeName, 'readonly').objectStore(args.storeName).count();
      countRequest.onerror = () => reject(new Error(`${args.storeName} count failed: ${String(countRequest.error)}`));
      countRequest.onsuccess = () => resolve(countRequest.result);
    };
  });
}
export async function countAccountRecords(page: Page, storeName: string): Promise<number> {
  const databaseName = await accountDatabaseName(page);
  return page.evaluate(countRecords, { databaseName, storeName });
}
