import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthApi } from '../core/api/auth-api';
import type { AuthResponse, AuthUser } from '../core/api/auth.model';
import { AuthStore } from '../core/auth/auth-store';
import { LocalDb } from '../core/db/local-db';
import type { StoredSession } from '../core/db/local-db.model';

export const AUTH_USER: AuthUser = {
  id: 'user-1',
  email: 'ana@exemplo.com',
  displayName: 'Ana',
  role: 'candidate',
  termsAccepted: true,
};
export const AUTH_RESPONSE: AuthResponse = { accessToken: 'token-1', expiresIn: 900, user: AUTH_USER };
export interface FakeLocalDb {
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
  readonly localDb: FakeLocalDb;
  readonly router: { navigate: ReturnType<typeof vi.fn<(commands: readonly string[]) => Promise<boolean>>> };
}
export function setOnline(online: boolean): void {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
}
function fakeLocalDb(): FakeLocalDb {
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
  const localDb = fakeLocalDb();
  const router = {
    navigate: vi.fn<(commands: readonly string[]) => Promise<boolean>>().mockResolvedValue(true),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthApi, useValue: authApi },
      { provide: LocalDb, useValue: localDb },
      { provide: Router, useValue: router },
    ],
  });
  return { store: TestBed.inject(AuthStore), authApi, localDb, router };
}
