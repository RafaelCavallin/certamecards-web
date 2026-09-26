import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthApi } from '../core/api/auth-api';
import type { AuthResponse, AuthUser } from '../core/api/auth.model';
import { AccountActivator } from '../core/db/account-activator';
import { AccountDbResolver } from '../core/db/account-db-resolver';
import { BootstrapDb } from '../core/db/bootstrap-db';
import { CurrentAccountDb } from '../core/db/current-account-db';
import { AuthStore } from '../core/auth/auth-store';
import type { StoredSession } from '../core/db/local-db.model';

export const AUTH_USER: AuthUser = {
  id: 'user-1',
  email: 'ana@exemplo.com',
  displayName: 'Ana',
  role: 'candidate',
  termsAccepted: true,
};
export const AUTH_RESPONSE: AuthResponse = { accessToken: 'token-1', expiresIn: 900, user: AUTH_USER };
export interface FakeBootstrapDb {
  readonly session: StoredSession | null;
  readonly getSession: ReturnType<typeof vi.fn<() => Promise<StoredSession | null>>>;
  readonly setSession: ReturnType<typeof vi.fn<(session: StoredSession) => Promise<void>>>;
  readonly clearSession: ReturnType<typeof vi.fn<() => Promise<void>>>;
}
export interface AuthStoreHarness {
  readonly store: AuthStore;
  readonly authApi: {
    refresh: ReturnType<typeof vi.fn<() => Promise<AuthResponse>>>;
    logout: ReturnType<typeof vi.fn<() => Promise<void>>>;
  };
  readonly bootstrapDb: FakeBootstrapDb;
  readonly accountActivator: {
    reauthenticate: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>>;
    open: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>>;
  };
  readonly accountDbResolver: { block: ReturnType<typeof vi.fn<(userId: string) => Promise<void>>> };
  readonly router: { navigate: ReturnType<typeof vi.fn<(commands: readonly string[]) => Promise<boolean>>> };
  readonly currentAccountDb: {
    current: () => FakeAccount | null;
    clear: ReturnType<typeof vi.fn<() => void>>;
    set: ReturnType<typeof vi.fn<(account: FakeAccount) => void>>;
  };
}
export interface FakeAccount {
  readonly db: { readonly delete: ReturnType<typeof vi.fn<() => Promise<void>>> };
}
export function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}
function fakeBootstrapDb(): FakeBootstrapDb {
  const state: { session: StoredSession | null } = { session: null };
  return {
    get session() {
      return state.session;
    },
    getSession: vi.fn<() => Promise<StoredSession | null>>(() => Promise.resolve(state.session)),
    setSession: vi.fn<(session: StoredSession) => Promise<void>>((session) => {
      state.session = session;
      return Promise.resolve();
    }),
    clearSession: vi.fn<() => Promise<void>>(() => {
      state.session = null;
      return Promise.resolve();
    }),
  };
}
export function setupAuthStore(): AuthStoreHarness {
  const authApi = {
    refresh: vi.fn<() => Promise<AuthResponse>>(),
    logout: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
  const bootstrapDb = fakeBootstrapDb();
  const accountActivator = {
    reauthenticate: vi.fn<(userId: string) => Promise<void>>().mockResolvedValue(undefined),
    open: vi.fn<(userId: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  const accountDbResolver = { block: vi.fn<(userId: string) => Promise<void>>().mockResolvedValue(undefined) };
  const accountRef: { current: FakeAccount | null } = { current: null };
  const currentAccountDb = {
    current: () => accountRef.current,
    clear: vi.fn<() => void>(() => {
      accountRef.current = null;
    }),
    set: vi.fn<(account: FakeAccount) => void>((account) => {
      accountRef.current = account;
    }),
  };
  const router = {
    navigate: vi.fn<(commands: readonly string[]) => Promise<boolean>>().mockResolvedValue(true),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthApi, useValue: authApi },
      { provide: BootstrapDb, useValue: bootstrapDb },
      { provide: AccountActivator, useValue: accountActivator },
      { provide: AccountDbResolver, useValue: accountDbResolver },
      { provide: CurrentAccountDb, useValue: currentAccountDb },
      { provide: Router, useValue: router },
    ],
  });
  return {
    store: TestBed.inject(AuthStore),
    authApi,
    bootstrapDb,
    accountActivator,
    accountDbResolver,
    router,
    currentAccountDb,
  };
}
