import type { Routes } from '@angular/router';

export const STUDY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./study-page/study-page').then((m) => m.StudyPage),
  },
];
