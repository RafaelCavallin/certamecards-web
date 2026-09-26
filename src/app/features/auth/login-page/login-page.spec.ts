import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { LoginPage } from './login-page';

interface Harness {
  readonly login: ReturnType<typeof vi.fn>;
  readonly setSession: ReturnType<typeof vi.fn>;
  readonly navigateByUrl: ReturnType<typeof vi.fn>;
}

function setup(): Harness {
  const login = vi.fn();
  const setSession = vi.fn();
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: { login } }, { provide: AuthStore, useValue: { setSession } }],
  });
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { login, setSession, navigateByUrl };
}

function fillAndSubmit(fixture: ReturnType<typeof TestBed.createComponent<LoginPage>>): void {
  setInputValue(fixture, '#login-email', 'ana@exemplo.com');
  setInputValue(fixture, '#login-password', 'senha1234');
  submitForm(fixture);
}

it('TU — login bem-sucedido aplica a sessão e navega para o painel', async () => {
  const { login, setSession, navigateByUrl } = setup();
  login.mockResolvedValue({
    accessToken: 't',
    expiresIn: 900,
    user: { id: '1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate', termsAccepted: true },
  });
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  fillAndSubmit(fixture);
  await fixture.whenStable();
  expect(setSession).toHaveBeenCalled();
  expect(navigateByUrl).toHaveBeenCalledWith('/');
});

it('TU — credenciais inválidas mostram a mensagem de erro', async () => {
  const { login, setSession } = setup();
  login.mockRejectedValue(new HttpErrorResponse({ status: 401, error: { code: 'invalid_credentials', detail: 'x' } }));
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  fillAndSubmit(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(setSession).not.toHaveBeenCalled();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('E-mail ou senha incorretos');
});

it('TU — bloqueio de login mostra o tempo restante', async () => {
  const { login } = setup();
  login.mockRejectedValue(
    new HttpErrorResponse({ status: 429, error: { code: 'login_locked', detail: 'x', retryAfterSeconds: 540 } }),
  );
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  fillAndSubmit(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('9 minutos');
});

it('TU — o acesso com o Google fica oculto nesta versão', () => {
  setup();
  const fixture = TestBed.createComponent(LoginPage);
  fixture.detectChanges();
  const html = (fixture.nativeElement as HTMLElement).innerHTML;
  expect(html).not.toContain('Google');
  expect(html).not.toContain('oauth2/authorization');
});
