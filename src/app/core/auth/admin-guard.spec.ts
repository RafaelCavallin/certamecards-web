import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it } from 'vitest';
import { adminGuard } from './admin-guard';
import { AuthStore } from './auth-store';

interface GuardState {
  readonly isAuthenticated: boolean;
  readonly isAdmin: boolean;
}

function setup(state: GuardState): Router {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthStore,
        useValue: { isAuthenticated: () => state.isAuthenticated, isAdmin: () => state.isAdmin },
      },
    ],
  });
  return TestBed.inject(Router);
}

function runGuard(): boolean | ReturnType<Router['createUrlTree']> {
  return TestBed.runInInjectionContext(() => adminGuard());
}

it('TU — permite acesso quando o usuário é administrador', () => {
  setup({ isAuthenticated: true, isAdmin: true });
  expect(runGuard()).toBe(true);
});

it('TU — redireciona para Entrar quando o usuário não está autenticado', () => {
  const router = setup({ isAuthenticated: false, isAdmin: false });
  const result = runGuard();
  if (typeof result === 'boolean') {
    throw new Error('esperava um UrlTree');
  }
  expect(router.serializeUrl(result)).toBe('/entrar');
});

it('TU — redireciona para o painel quando o candidato não é administrador', () => {
  const router = setup({ isAuthenticated: true, isAdmin: false });
  const result = runGuard();
  if (typeof result === 'boolean') {
    throw new Error('esperava um UrlTree');
  }
  expect(router.serializeUrl(result)).toBe('/');
});
