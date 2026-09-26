import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../api/auth-api';
import type { AuthResponse, AuthUser } from '../api/auth.model';
import { AccountActivator } from '../db/account-activator';
import { AccountDbResolver } from '../db/account-db-resolver';
import { BootstrapDb } from '../db/bootstrap-db';
import { CurrentAccountDb } from '../db/current-account-db';
import { ACCESS_TOKEN_REFRESH_MARGIN_MS, AUTH_PATHS } from './auth-constants';
import { RefreshScheduler } from './refresh-scheduler';
import { toAuthUser, toStoredSession } from './session-mapper';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authApi = inject(AuthApi);
  private readonly bootstrapDb = inject(BootstrapDb);
  private readonly accountActivator = inject(AccountActivator);
  private readonly accountDbResolver = inject(AccountDbResolver);
  private readonly currentAccountDb = inject(CurrentAccountDb);
  private readonly router = inject(Router);
  private readonly refreshScheduler = inject(RefreshScheduler);
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly initializingSignal = signal(true);
  private pendingRefresh: Promise<boolean> | null = null;

  readonly user = this.userSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly initializing = this.initializingSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');
  readonly termsAccepted = computed(() => this.userSignal()?.termsAccepted ?? false);

  async initialize(): Promise<void> {
    if (navigator.onLine) {
      await this.refresh();
    } else {
      await this.loadFromLocalSession();
    }
    this.initializingSignal.set(false);
  }

  async setSession(response: AuthResponse): Promise<void> {
    await this.accountActivator.reauthenticate(response.user.id);
    this.userSignal.set(response.user);
    this.accessTokenSignal.set(response.accessToken);
    this.scheduleRefresh(response.expiresIn);
    await this.bootstrapDb.setSession(toStoredSession(response.user));
  }

  updateUser(user: AuthUser): void {
    this.userSignal.set(user);
    void this.bootstrapDb.setSession(toStoredSession(user));
  }

  async refresh(): Promise<boolean> {
    try {
      await this.setSession(await this.authApi.refresh());
      return true;
    } catch (error) {
      return this.handleRefreshFailure(error);
    }
  }

  async handleUnauthorized(): Promise<boolean> {
    this.pendingRefresh ??= this.refresh().finally(() => {
      this.pendingRefresh = null;
    });
    return this.pendingRefresh;
  }

  async logout(): Promise<void> {
    await this.authApi.logout();
    await this.finishLocalLogout();
    await this.router.navigate([AUTH_PATHS.login]);
  }

  private async handleRefreshFailure(error: unknown): Promise<boolean> {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      await this.revoke();
    }
    return false;
  }

  private async revoke(): Promise<void> {
    const userId = this.userSignal()?.id;
    this.clearLocalAuthState();
    await this.bootstrapDb.clearSession();
    if (userId !== undefined) {
      await this.accountDbResolver.block(userId);
    }
  }

  private async finishLocalLogout(): Promise<void> {
    const account = this.currentAccountDb.current();
    this.clearLocalAuthState();
    await this.bootstrapDb.clearSession();
    if (account !== null) {
      await account.db.delete();
    }
  }

  private clearLocalAuthState(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.refreshScheduler.clear();
    this.currentAccountDb.clear();
  }

  private async loadFromLocalSession(): Promise<void> {
    const session = await this.bootstrapDb.getSession();
    if (session !== null) {
      this.userSignal.set(toAuthUser(session));
    }
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    const delayMs = Math.max(expiresInSeconds * 1000 - ACCESS_TOKEN_REFRESH_MARGIN_MS, 0);
    this.refreshScheduler.schedule(delayMs, () => void this.refresh());
  }
}
