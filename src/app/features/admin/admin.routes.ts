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
  {
    path: 'decks-oficiais',
    loadComponent: () => import('./official-decks-page/official-decks-page').then((m) => m.OfficialDecksPage),
  },
  {
    path: 'decks-oficiais/novo',
    loadComponent: () =>
      import('./official-deck-editor-page/official-deck-editor-page').then((m) => m.OfficialDeckEditorPage),
  },
  {
    path: 'decks-oficiais/:id',
    loadComponent: () =>
      import('./official-deck-editor-page/official-deck-editor-page').then((m) => m.OfficialDeckEditorPage),
  },
  {
    path: 'apontamentos',
    loadComponent: () => import('./error-reports-page/error-reports-page').then((m) => m.ErrorReportsPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./audit-log-page/audit-log-page').then((m) => m.AuditLogPage),
  },
];
