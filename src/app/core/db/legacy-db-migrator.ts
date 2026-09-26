import type { AccountDb } from './account-db';
import type { BootstrapDb } from './bootstrap-db';
import type { LocalDb } from './local-db';
import type { LegacyMigrationRecord, LegacyMigrationStepName } from './bootstrap-db.model';
import { clearLegacyContentStores, copyLegacyStores } from './legacy-store-pairs';
import { countLegacyStores } from './legacy-store-verifier';

export class LegacyMigrationIncompleteError extends Error {
  constructor(storeName: string) {
    super(`legacy store ${storeName} was not fully copied`);
  }
}
export class LegacyDbMigrator {
  constructor(
    private readonly bootstrapDb: BootstrapDb,
    private readonly legacyDb: LocalDb,
    private readonly accountDb: AccountDb,
  ) {}

  async migrate(userId: string): Promise<void> {
    const record = await this.currentStep(userId);
    if (record.step === 'cleaned_up') {
      return;
    }
    await copyLegacyStores(this.legacyDb, this.accountDb);
    const counts = await this.verifiedCounts();
    await this.saveStep(userId, 'verified', counts);
    await clearLegacyContentStores(this.legacyDb);
    await this.saveStep(userId, 'cleaned_up', counts);
  }

  private async verifiedCounts(): Promise<Readonly<Record<string, number>>> {
    const { source, destination } = await countLegacyStores(this.legacyDb, this.accountDb);
    for (const storeName of Object.keys(source)) {
      if ((destination[storeName] ?? 0) < (source[storeName] ?? 0)) {
        throw new LegacyMigrationIncompleteError(storeName);
      }
    }
    return destination;
  }

  private async currentStep(userId: string): Promise<LegacyMigrationRecord> {
    const existing = await this.bootstrapDb.legacyMigration.get(userId);
    return existing ?? { userId, step: 'not_started', verifiedCounts: {}, updatedAt: new Date().toISOString() };
  }

  private async saveStep(
    userId: string,
    step: LegacyMigrationStepName,
    verifiedCounts: Readonly<Record<string, number>>,
  ): Promise<void> {
    await this.bootstrapDb.legacyMigration.put({ userId, step, verifiedCounts, updatedAt: new Date().toISOString() });
  }
}
