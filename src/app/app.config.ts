import type { ApplicationConfig } from '@angular/core';
import { ErrorHandler, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth-interceptor';
import { AuthStore } from './core/auth/auth-store';
import { connectivityInterceptor } from './core/connectivity/connectivity-interceptor';
import { AppDatabaseBootstrap } from './core/db/app-database-bootstrap';
import { LocalDb } from './core/db/local-db';
import { GlobalErrorHandler } from './core/events/global-error-handler';
import { ParamAwareReuseStrategy } from './core/navigation/param-aware-reuse-strategy';
import { InstallTracker } from './core/pwa/install-tracker';
import { requestPersistentStorage } from './core/pwa/persistent-storage';
import { ServiceWorkerUpdates } from './core/pwa/service-worker-updates';
import { SyncCycleCoordinator } from './core/sync/sync-cycle-coordinator';
import { ThemeService } from './core/theme/theme-service';

async function initializeApp(): Promise<void> {
  const databaseBootstrap = inject(AppDatabaseBootstrap);
  const authStore = inject(AuthStore);
  const localDb = inject(LocalDb);
  inject(SyncCycleCoordinator);
  inject(ThemeService);
  inject(ServiceWorkerUpdates).listen();
  inject(InstallTracker).listen();
  await databaseBootstrap.run();
  await Promise.all([authStore.initialize(), localDb.getOrCreateDeviceId(), requestPersistentStorage()]);
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: ParamAwareReuseStrategy },
    provideHttpClient(withInterceptors([connectivityInterceptor, authInterceptor])),
    provideAppInitializer(initializeApp),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
