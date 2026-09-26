import { Injectable, inject } from '@angular/core';
import type { UpdateUserSettingsRequest } from '../api/settings-api';
import type { UserSettings } from '../api/settings.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { AccountSettingsRow, SettingsFieldName } from '../db/account-db.model';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

const SETTINGS_FIELDS: readonly SettingsFieldName[] = ['newPerDay', 'reviewsPerDay', 'focusMinutes', 'examDate', 'timeZone', 'theme'];
const DEFAULT_SETTINGS: UserSettings = {
  newPerDay: 20, reviewsPerDay: 200, focusMinutes: 25, examDate: null, timeZone: 'America/Sao_Paulo', theme: 'auto', changeSeq: 0,
};
export interface SettingsPatchCommand {
  readonly kind: 'settings_patch';
  readonly changes: UpdateUserSettingsRequest;
}
function changedFields(current: UserSettings, changes: UpdateUserSettingsRequest): readonly SettingsFieldName[] {
  return SETTINGS_FIELDS.filter((field) => current[field] !== changes[field]);
}
function pickChanges(changes: UpdateUserSettingsRequest, fields: readonly SettingsFieldName[]): Partial<UserSettings> {
  return fields.reduce<Partial<UserSettings>>((acc, field) => ({ ...acc, [field]: changes[field] }), {});
}
function tickFieldClocks(
  current: AccountSettingsRow['fieldClocks'],
  fields: readonly SettingsFieldName[],
  clock: AccountSettingsRow['fieldClocks'][SettingsFieldName],
): AccountSettingsRow['fieldClocks'] {
  return fields.reduce<AccountSettingsRow['fieldClocks']>((acc, field) => ({ ...acc, [field]: clock }), current);
}
@Injectable({ providedIn: 'root' })
export class SettingsMutationWriter implements LocalMutationWriter<SettingsPatchCommand, UserSettings> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: SettingsPatchCommand): Promise<UserSettings> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.settings, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.apply(context, command));
  }

  private async apply(context: EnvelopeContext, command: SettingsPatchCommand): Promise<UserSettings> {
    const current = (await context.db.settings.get(context.userId)) ?? { ...DEFAULT_SETTINGS, userId: context.userId, fieldClocks: {} };
    const fields = changedFields(current, command.changes);
    if (fields.length === 0) {
      return current;
    }
    const envelope = await buildOperationEnvelope(context, {
      kind: 'settings_patch', entityId: context.userId, parentId: null, baseVersion: null,
      predecessorOperationId: null, dependsOn: [],
      payload: { kind: 'settings_patch', changes: pickChanges(command.changes, fields) },
    });
    const updated: AccountSettingsRow = {
      ...current,
      ...command.changes,
      userId: context.userId,
      fieldClocks: tickFieldClocks(current.fieldClocks, fields, envelope.clock),
    };
    await context.db.settings.put(updated);
    await context.db.syncOperations.add(envelope);
    return updated;
  }
}
