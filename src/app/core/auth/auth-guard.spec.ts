import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it } from 'vitest';
import { authGuard } from './auth-guard';
import { AuthStore } from './auth-store';

function setup(isAuthenticated: boolean): Router {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthStore, useValue: { isAuthenticated: () => isAuthenticated } }],
  });
  return TestBed.inject(Router);
}

it('TU — permite acesso quando o usuário está autenticado', () => {
  setup(true);
  expect(TestBed.runInInjectionContext(() => authGuard())).toBe(true);
});

it('TU — redireciona para Entrar quando o usuário não está autenticado', () => {
  const router = setup(false);
  const result = TestBed.runInInjectionContext(() => authGuard());
  if (typeof result === 'boolean') {
    throw new Error('esperava um UrlTree');
  }
  expect(router.serializeUrl(result)).toBe('/entrar');
});
