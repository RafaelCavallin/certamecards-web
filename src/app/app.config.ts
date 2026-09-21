import type { ApplicationConfig } from '@angular/core';
import { ErrorHandler, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthStore } from './core/auth/auth-store';
import { connectivityInterceptor } from './core/connectivity/connectivity-interceptor';
import { LocalDb } from './core/db/local-db';
import { GlobalErrorHandler } from './core/events/global-error-handler';
import { InstallTracker } from './core/pwa/install-tracker';
import { requestPersistentStorage } from './core/pwa/persistent-storage';
import { ServiceWorkerUpdates } from './core/pwa/service-worker-updates';
import { SyncService } from './core/sync/sync-service';
import { ThemeService } from './core/theme/theme-service';

async function initializeApp(): Promise<void> {
  const authStore = inject(AuthStore);
  const localDb = inject(LocalDb);
  inject(SyncService);
  inject(ThemeService);
  inject(ServiceWorkerUpdates).listen();
  inject(InstallTracker).listen();
  await Promise.all([authStore.initialize(), localDb.getOrCreateDeviceId(), requestPersistentStorage()]);
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes),
    provideHttpClient(withInterceptors([connectivityInterceptor, authInterceptor])),
    provideAppInitializer(initializeApp),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
