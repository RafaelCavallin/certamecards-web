import { Injectable, Injector, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Subject } from '../api/subject.model';
import { CurrentAccountDb } from '../db/current-account-db';
import type { CurrentAccount } from '../db/current-account-db';
import { accountLiveSignal } from './account-live-query';

@Injectable({ providedIn: 'root' })
export class SubjectsData {
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly injector = inject(Injector);

  readonly active: Signal<readonly Subject[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => this.fetchActive(account),
    initialValue: [],
  });
  readonly all: Signal<readonly Subject[]> = accountLiveSignal(this.injector, this.currentAccountDb, {
    query: (account) => account.db.subjects.toArray(),
    initialValue: [],
  });

  private async fetchActive(account: CurrentAccount): Promise<Subject[]> {
    const all = await account.db.subjects.toArray();
    return all.filter((subject) => subject.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
}
