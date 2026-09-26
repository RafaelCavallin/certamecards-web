import { runInInjectionContext } from '@angular/core';
import type { Injector, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { liveQuery } from 'dexie';
import { from, of, switchMap } from 'rxjs';
import type { CurrentAccount } from '../db/current-account-db';
import type { CurrentAccountDb } from '../db/current-account-db';

export interface AccountLiveQuery<T> {
  readonly query: (account: CurrentAccount) => Promise<T>;
  readonly initialValue: T;
}
export function accountLiveSignal<T>(
  injector: Injector,
  currentAccountDb: CurrentAccountDb,
  options: AccountLiveQuery<T>,
): Signal<T> {
  return runInInjectionContext(injector, () =>
    toSignal(
      toObservable(currentAccountDb.current).pipe(
        switchMap((account: CurrentAccount | null) =>
          account === null ? of(options.initialValue) : from(liveQuery(() => options.query(account))),
        ),
      ),
      { initialValue: options.initialValue },
    ),
  );
}
