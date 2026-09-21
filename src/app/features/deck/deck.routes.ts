import type { Routes } from '@angular/router';

export const DECK_ROUTES: Routes = [
  {
    path: 'novo',
    loadComponent: () => import('./deck-form-page/deck-form-page').then((m) => m.DeckFormPage),
  },
  {
    path: ':id',
    loadComponent: () => import('./deck-page/deck-page').then((m) => m.DeckPage),
  },
];
