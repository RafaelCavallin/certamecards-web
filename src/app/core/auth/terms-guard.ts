import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { UrlTree } from '@angular/router';
import { AUTH_PATHS } from './auth-constants';
import { AuthStore } from './auth-store';

export function termsGuard(): boolean | UrlTree {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (!authStore.isAuthenticated()) {
    return router.createUrlTree([AUTH_PATHS.login]);
  }
  return authStore.termsAccepted() ? true : router.createUrlTree([AUTH_PATHS.acceptTerms]);
}
