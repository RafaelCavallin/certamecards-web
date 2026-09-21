import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../api/auth-api';
import type { AuthResponse, AuthUser } from '../api/auth.model';
import { LocalDb } from '../db/local-db';
import { ACCESS_TOKEN_REFRESH_MARGIN_MS, AUTH_PATHS } from './auth-constants';
import { RefreshScheduler } from './refresh-scheduler';
import { toAuthUser, toStoredSession } from './session-mapper';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authApi = inject(AuthApi);
  private readonly localDb = inject(LocalDb);
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

  setSession(response: AuthResponse): void {
    this.userSignal.set(response.user);
    this.accessTokenSignal.set(response.accessToken);
    this.scheduleRefresh(response.expiresIn);
    void this.persistSession(response.user);
  }

  updateUser(user: AuthUser): void {
    this.userSignal.set(user);
    void this.persistSession(user);
  }

  async refresh(): Promise<boolean> {
    try {
      this.setSession(await this.authApi.refresh());
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async handleUnauthorized(): Promise<boolean> {
    this.pendingRefresh ??= this.refresh().finally(() => {
      this.pendingRefresh = null;
    });
    return this.pendingRefresh;
  }

  async logout(): Promise<void> {
    await this.authApi.logout().catch(() => undefined);
    this.clearSession();
    await this.router.navigate([AUTH_PATHS.login]);
  }

  private async loadFromLocalSession(): Promise<void> {
    const session = await this.localDb.getSession();
    if (session !== null) {
      this.userSignal.set(toAuthUser(session));
    }
  }

  private persistSession(user: AuthUser): Promise<void> {
    return this.localDb.setSession(toStoredSession(user));
  }

  private clearSession(): void {
    this.userSignal.set(null);
    this.accessTokenSignal.set(null);
    this.refreshScheduler.clear();
    void this.localDb.clearSession();
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    const delayMs = Math.max(expiresInSeconds * 1000 - ACCESS_TOKEN_REFRESH_MARGIN_MS, 0);
    this.refreshScheduler.schedule(delayMs, () => void this.refresh());
  }
}
