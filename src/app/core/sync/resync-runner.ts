import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { extractApiError } from '../api/api-error.model';
import type { AccountDb } from '../db/account-db';
import { GlobalPullRunner } from './global-pull-runner';
import { RESYNC_REQUIRED_CODE } from './sync-constants';

export function isResyncRequired(error: unknown): boolean {
  return error instanceof HttpErrorResponse && extractApiError(error)?.code === RESYNC_REQUIRED_CODE;
}
@Injectable({ providedIn: 'root' })
export class ResyncRunner {
  private readonly pullRunner = inject(GlobalPullRunner);

  async resync(db: AccountDb, userId: string): Promise<void> {
    await db.setCursor(0);
    await this.pullRunner.pull(db, userId);
  }
}
