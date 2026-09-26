import { LOCAL_DB_SCHEMA_VERSIONS } from './local-db-schema';
import type { StoreDefinitions } from './local-db-schema';

const LATEST_LEGACY_STORES = LOCAL_DB_SCHEMA_VERSIONS[LOCAL_DB_SCHEMA_VERSIONS.length - 1] ?? {};
const STORES_V4: StoreDefinitions = { ...LATEST_LEGACY_STORES, accounts: 'userId', legacyMigration: 'userId' };
export const BOOTSTRAP_DB_SCHEMA_VERSIONS: readonly StoreDefinitions[] = [...LOCAL_DB_SCHEMA_VERSIONS, STORES_V4];
