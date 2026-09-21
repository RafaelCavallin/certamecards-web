import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it } from 'vitest';
import { AuthStore } from './auth-store';
import { termsGuard } from './terms-guard';

interface GuardState {
  readonly isAuthenticated: boolean;
  readonly termsAccepted: boolean;
}

function setup(state: GuardState): Router {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AuthStore,
        useValue: { isAuthenticated: () => state.isAuthenticated, termsAccepted: () => state.termsAccepted },
      },
    ],
  });
  return TestBed.inject(Router);
}

function runGuard(): boolean | ReturnType<Router['createUrlTree']> {
  return TestBed.runInInjectionContext(() => termsGuard());
}

it('TU — permite acesso quando os termos já foram aceitos', () => {
  setup({ isAuthenticated: true, termsAccepted: true });
  expect(runGuard()).toBe(true);
});

it('TU — redireciona para Entrar quando o usuário não está autenticado', () => {
  const router = setup({ isAuthenticated: false, termsAccepted: false });
  const result = runGuard();
  if (typeof result === 'boolean') {
    throw new Error('esperava um UrlTree');
  }
  expect(router.serializeUrl(result)).toBe('/entrar');
});

it('TU — redireciona para a tela de termos quando ainda não foram aceitos', () => {
  const router = setup({ isAuthenticated: true, termsAccepted: false });
  const result = runGuard();
  if (typeof result === 'boolean') {
    throw new Error('esperava um UrlTree');
  }
  expect(router.serializeUrl(result)).toBe('/termos');
});
