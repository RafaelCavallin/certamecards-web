import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { rootText, setInputValue, submitForm } from '../../../testing/dom-testing';
import { ResetPasswordPage } from './reset-password-page';

function setup(): ReturnType<typeof vi.fn> {
  const resetPassword = vi.fn();
  TestBed.configureTestingModule({
    imports: [ResetPasswordPage],
    providers: [
      provideRouter([]),
      { provide: AuthApi, useValue: { resetPassword } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'token=tok' } } },
    ],
  });
  return resetPassword;
}

function fillPasswords(fixture: ReturnType<typeof TestBed.createComponent<ResetPasswordPage>>, a: string, b: string): void {
  setInputValue(fixture, '#reset-new-password', a);
  setInputValue(fixture, '#reset-confirm-password', b);
}

it('TU — senhas diferentes impedem o envio', async () => {
  const resetPassword = setup();
  const fixture = TestBed.createComponent(ResetPasswordPage);
  fixture.detectChanges();
  fillPasswords(fixture, 'senha1234', 'outrasenha');
  submitForm(fixture);
  await fixture.whenStable();
  expect(resetPassword).not.toHaveBeenCalled();
});

it('TU — redefine a senha com sucesso', async () => {
  const resetPassword = setup();
  resetPassword.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(ResetPasswordPage);
  fixture.detectChanges();
  fillPasswords(fixture, 'senha1234', 'senha1234');
  submitForm(fixture);
  await fixture.whenStable();
  expect(resetPassword).toHaveBeenCalledWith({ token: 'tok', newPassword: 'senha1234' });
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Senha redefinida');
});

it('TU — token expirado mostra a tela de link expirado', async () => {
  const resetPassword = setup();
  resetPassword.mockRejectedValue(new HttpErrorResponse({ status: 410, error: { code: 'token_expired', detail: 'x' } }));
  const fixture = TestBed.createComponent(ResetPasswordPage);
  fixture.detectChanges();
  fillPasswords(fixture, 'senha1234', 'senha1234');
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Esse link expirou');
});
