import { Injectable, inject } from '@angular/core';
import { CurrentAccountDb } from '../db/current-account-db';
import type { ProfileRow } from '../db/account-db.model';
import type { LocalMutationWriter } from './local-mutation-writer';
import { runMutationTransaction } from './local-mutation-writer';
import type { EnvelopeContext } from './sync-operation-envelope';
import { buildOperationEnvelope } from './sync-operation-envelope';

export interface ProfilePatchCommand {
  readonly kind: 'profile_patch';
  readonly displayName: string;
}
@Injectable({ providedIn: 'root' })
export class ProfileMutationWriter implements LocalMutationWriter<ProfilePatchCommand, ProfileRow> {
  private readonly currentAccountDb = inject(CurrentAccountDb);

  async execute(command: ProfilePatchCommand): Promise<ProfileRow> {
    const account = this.currentAccountDb.require();
    const context: EnvelopeContext = { db: account.db, userId: account.userId, deviceId: await this.currentAccountDb.deviceId() };
    const tables = [context.db.profile, context.db.syncOperations, context.db.meta];
    return runMutationTransaction(context.db, tables, () => this.apply(context, command));
  }

  private async apply(context: EnvelopeContext, command: ProfilePatchCommand): Promise<ProfileRow> {
    const current = await context.db.profile.get(context.userId);
    if (current?.displayName === command.displayName) {
      return current;
    }
    const envelope = await buildOperationEnvelope(context, {
      kind: 'profile_patch', entityId: context.userId, parentId: null, baseVersion: null,
      predecessorOperationId: null, dependsOn: [], payload: { kind: 'profile_patch', displayName: command.displayName },
    });
    const profile: ProfileRow = { userId: context.userId, displayName: command.displayName, displayNameClock: envelope.clock };
    await context.db.profile.put(profile);
    await context.db.syncOperations.add(envelope);
    return profile;
  }
}
