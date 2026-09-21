import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { GoogleCompletePage } from './google-complete-page';

interface Harness {
  readonly refresh: ReturnType<typeof vi.fn>;
  readonly setSession: ReturnType<typeof vi.fn>;
  readonly navigateByUrl: ReturnType<typeof vi.fn>;
  readonly navigate: ReturnType<typeof vi.fn>;
}

function setup(): Harness {
  const refresh = vi.fn();
  const setSession = vi.fn();
  TestBed.configureTestingModule({
    imports: [GoogleCompletePage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: { refresh } }, { provide: AuthStore, useValue: { setSession } }],
  });
  const router = TestBed.inject(Router);
  return {
    refresh,
    setSession,
    navigateByUrl: vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true),
    navigate: vi.spyOn(router, 'navigate').mockResolvedValue(true),
  };
}

it('TU — conclui o login e vai para o painel quando os termos já foram aceitos', async () => {
  const { refresh, setSession, navigateByUrl } = setup();
  refresh.mockResolvedValue({
    accessToken: 't',
    expiresIn: 900,
    user: { id: '1', email: 'a@a.com', displayName: 'A', role: 'candidate', termsAccepted: true },
  });
  TestBed.createComponent(GoogleCompletePage);
  await vi.waitFor(() => expect(setSession).toHaveBeenCalled());
  expect(navigateByUrl).toHaveBeenCalledWith('/');
});

it('TU — leva para a tela de termos quando ainda não foram aceitos', async () => {
  const { refresh, navigateByUrl } = setup();
  refresh.mockResolvedValue({
    accessToken: 't',
    expiresIn: 900,
    user: { id: '1', email: 'a@a.com', displayName: 'A', role: 'candidate', termsAccepted: false },
  });
  TestBed.createComponent(GoogleCompletePage);
  await vi.waitFor(() => expect(navigateByUrl).toHaveBeenCalledWith('/termos'));
});

it('TU — leva para Entrar com erro quando o refresh falha', async () => {
  const { refresh, navigate } = setup();
  refresh.mockRejectedValue(new Error('unauthenticated'));
  TestBed.createComponent(GoogleCompletePage);
  await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { erro: 'google' } }));
});
