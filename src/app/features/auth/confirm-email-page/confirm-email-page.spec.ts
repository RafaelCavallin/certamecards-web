import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { EventsService } from '../../../core/events/events-service';
import { clickElement, rootText } from '../../../testing/dom-testing';
import { ConfirmEmailPage } from './confirm-email-page';

interface Harness {
  readonly confirmEmail: ReturnType<typeof vi.fn>;
  readonly resendConfirmation: ReturnType<typeof vi.fn>;
}

interface SetupOptions {
  readonly fragment?: string;
  readonly email?: string;
}

function setup(options: SetupOptions): Harness {
  const authApi = { confirmEmail: vi.fn(), resendConfirmation: vi.fn().mockResolvedValue(undefined) };
  const queryParamMap = new URLSearchParams(options.email === undefined ? {} : { email: options.email });
  TestBed.configureTestingModule({
    imports: [ConfirmEmailPage],
    providers: [
      provideRouter([]),
      { provide: AuthApi, useValue: authApi },
      { provide: EventsService, useValue: { record: vi.fn() } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: options.fragment ?? null, queryParamMap } } },
    ],
  });
  return authApi;
}

it('TU — sem token mostra a mensagem de confirmação pendente', () => {
  setup({});
  const fixture = TestBed.createComponent(ConfirmEmailPage);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Confirme seu e-mail');
});

it('TU — com token válido confirma e mostra sucesso', async () => {
  const { confirmEmail } = setup({ fragment: 'token=abc' });
  confirmEmail.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(ConfirmEmailPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(confirmEmail).toHaveBeenCalledWith('abc');
  expect(rootText(fixture)).toContain('E-mail confirmado');
});

it('TU — token expirado mostra a mensagem de link expirado', async () => {
  const { confirmEmail } = setup({ fragment: 'token=abc' });
  confirmEmail.mockRejectedValue(new HttpErrorResponse({ status: 410, error: { code: 'token_expired', detail: 'x' } }));
  const fixture = TestBed.createComponent(ConfirmEmailPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Esse link expirou');
});

it('TU — reenviar dispara o resend e desabilita o botão', async () => {
  const { resendConfirmation } = setup({ email: 'ana@exemplo.com' });
  const fixture = TestBed.createComponent(ConfirmEmailPage);
  fixture.detectChanges();
  clickElement(fixture, 'button[type="submit"]');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(resendConfirmation).toHaveBeenCalledWith('ana@exemplo.com');
});
