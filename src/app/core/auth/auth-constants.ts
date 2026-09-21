import { environment } from '../../../environments/environment';

export const TERMS_CURRENT_VERSION = '2026-09-01';
export const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60_000;
export const RESEND_CONFIRMATION_COOLDOWN_MS = 60_000;
export const AUTH_PATHS = {
  home: '/',
  login: '/entrar',
  register: '/cadastrar',
  confirmEmail: '/confirmar-email',
  forgotPassword: '/esqueci-senha',
  resetPassword: '/redefinir-senha',
  googleComplete: '/entrar/concluir',
  googleLink: '/entrar/vincular',
  acceptTerms: '/termos',
  deleteAccount: '/ajustes/excluir-conta',
  googleAuthorization: `${environment.apiBaseUrl}/auth/oauth2/authorization/google`,
} as const;
