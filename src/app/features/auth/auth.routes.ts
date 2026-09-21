import type { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth-guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'entrar',
    loadComponent: () => import('./login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'entrar/concluir',
    loadComponent: () => import('./google-complete-page/google-complete-page').then((m) => m.GoogleCompletePage),
  },
  {
    path: 'entrar/vincular',
    loadComponent: () => import('./google-link-page/google-link-page').then((m) => m.GoogleLinkPage),
  },
  {
    path: 'cadastrar',
    loadComponent: () => import('./register-page/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'confirmar-email',
    loadComponent: () => import('./confirm-email-page/confirm-email-page').then((m) => m.ConfirmEmailPage),
  },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'redefinir-senha',
    loadComponent: () => import('./reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'termos',
    canActivate: [authGuard],
    loadComponent: () => import('./accept-terms-page/accept-terms-page').then((m) => m.AcceptTermsPage),
  },
];
