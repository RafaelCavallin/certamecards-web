import { HttpErrorResponse } from '@angular/common/http';
import type { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from './auth-store';

const PUBLIC_AUTH_PATHS = [
  `${environment.apiBaseUrl}/auth/register`,
  `${environment.apiBaseUrl}/auth/confirm-email`,
  `${environment.apiBaseUrl}/auth/resend-confirmation`,
  `${environment.apiBaseUrl}/auth/login`,
  `${environment.apiBaseUrl}/auth/refresh`,
  `${environment.apiBaseUrl}/auth/logout`,
  `${environment.apiBaseUrl}/auth/password/forgot`,
  `${environment.apiBaseUrl}/auth/password/reset`,
  `${environment.apiBaseUrl}/auth/google/link`,
];
interface RetryContext {
  readonly req: HttpRequest<unknown>;
  readonly next: HttpHandlerFn;
  readonly authStore: AuthStore;
}
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const authStore = inject(AuthStore);
  if (PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path))) {
    return next(req);
  }
  const authorizedReq = attachToken(req, authStore.accessToken());
  return next(authorizedReq).pipe(
    catchError((error: unknown) => retryOnUnauthorized(error, { req: authorizedReq, next, authStore })),
  );
}
function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (token === null || !req.url.startsWith(environment.apiBaseUrl)) {
    return req;
  }
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
function retryOnUnauthorized(error: unknown, context: RetryContext): Observable<HttpEvent<unknown>> {
  if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
    return throwError(() => error);
  }
  const { req, next, authStore } = context;
  return from(authStore.handleUnauthorized()).pipe(
    switchMap((refreshed) => {
      if (!refreshed) {
        return throwError(() => error);
      }
      return next(attachToken(req, authStore.accessToken()));
    }),
  );
}
