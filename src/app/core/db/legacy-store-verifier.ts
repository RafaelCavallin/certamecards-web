import type { AccountDb } from './account-db';
import type { LocalDb } from './local-db';
import { storePairs } from './legacy-store-pairs';

export interface LegacyStoreCounts {
  readonly source: Readonly<Record<string, number>>;
  readonly destination: Readonly<Record<string, number>>;
}
export async function countLegacyStores(legacyDb: LocalDb, accountDb: AccountDb): Promise<LegacyStoreCounts> {
  const source: Record<string, number> = {};
  const destination: Record<string, number> = {};
  for (const pair of storePairs(legacyDb, accountDb)) {
    source[pair.name] = await pair.legacyCount();
    destination[pair.name] = await pair.accountCount();
  }
  return { source, destination };
}
