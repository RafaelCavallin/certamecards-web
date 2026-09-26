import type { Routes } from '@angular/router';

export const SYNC_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./sync-details-page').then((m) => m.SyncDetailsPage) },
  { path: 'conflitos', loadComponent: () => import('./conflicts-page').then((m) => m.ConflictsPage) },
];
