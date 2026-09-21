import { AUTH_PATHS } from './auth-constants';

export function postLoginRedirectPath(termsAccepted: boolean): string {
  return termsAccepted ? AUTH_PATHS.home : AUTH_PATHS.acceptTerms;
}
