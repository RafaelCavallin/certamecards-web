import type { Table } from 'dexie';
import type { AccountDb } from '../db/account-db';
import { isQuotaExceededError, LocalStorageFullError } from './local-storage-error';

export interface LocalMutationWriter<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}
export async function runMutationTransaction<T>(
  db: AccountDb,
  tables: readonly Table[],
  body: () => Promise<T>,
): Promise<T> {
  try {
    return await db.transaction('rw', tables as Table[], async () => body());
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new LocalStorageFullError();
    }
    throw error;
  }
}
