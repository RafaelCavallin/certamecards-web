import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import type { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { catchError, tap, throwError } from 'rxjs';
import { ConnectivityStore } from './connectivity-store';

export function connectivityInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const connectivity = inject(ConnectivityStore);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        connectivity.reportHttpStatus(event.status);
      }
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        connectivity.reportHttpStatus(error.status);
      }
      return throwError(() => error);
    }),
  );
}
