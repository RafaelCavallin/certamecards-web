import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { rootText, setInputValue, submitForm } from '../../../testing/dom-testing';
import { ForgotPasswordPage } from './forgot-password-page';

it('TU — envia o e-mail e mostra a confirmação de envio', async () => {
  const forgotPassword = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [ForgotPasswordPage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: { forgotPassword } }],
  });
  const fixture = TestBed.createComponent(ForgotPasswordPage);
  fixture.detectChanges();
  setInputValue(fixture, '#forgot-email', 'ana@exemplo.com');
  submitForm(fixture);
  await fixture.whenStable();
  expect(forgotPassword).toHaveBeenCalledWith('ana@exemplo.com');
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Verifique seu e-mail');
});
