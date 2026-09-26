import type { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin-guard';
import { authGuard } from './core/auth/auth-guard';
import { termsGuard } from './core/auth/terms-guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard, termsGuard],
    loadComponent: () => import('./features/dashboard/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'decks',
    canActivate: [authGuard, termsGuard],
    loadChildren: () => import('./features/deck/deck.routes').then((m) => m.DECK_ROUTES),
  },
  {
    path: 'biblioteca',
    canActivate: [authGuard, termsGuard],
    loadComponent: () => import('./features/library/library-page/library-page').then((m) => m.LibraryPage),
  },
  {
    path: 'sincronizacao',
    canActivate: [authGuard, termsGuard],
    loadChildren: () => import('./features/sync/sync.routes').then((m) => m.SYNC_ROUTES),
  },
  {
    path: 'estudar',
    canActivate: [authGuard, termsGuard],
    loadChildren: () => import('./features/study/study.routes').then((m) => m.STUDY_ROUTES),
  },
  {
    path: 'ajustes/excluir-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/delete-account-page/delete-account-page').then((m) => m.DeleteAccountPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
];
