import type { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'materias',
  },
  {
    path: 'materias',
    loadComponent: () => import('./subjects-page/subjects-page').then((m) => m.SubjectsPage),
  },
  {
    path: 'administradores',
    loadComponent: () => import('./admins-page/admins-page').then((m) => m.AdminsPage),
  },
];
