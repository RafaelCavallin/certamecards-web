import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { UrlTree } from '@angular/router';
import { AUTH_PATHS } from './auth-constants';
import { AuthStore } from './auth-store';

export function authGuard(): boolean | UrlTree {
  const authStore = inject(AuthStore);
  if (authStore.isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree([AUTH_PATHS.login]);
}
