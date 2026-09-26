import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { clickElement, setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { RegisterPage } from './register-page';

interface Harness {
  readonly register: ReturnType<typeof vi.fn>;
  readonly navigate: ReturnType<typeof vi.fn>;
}

function setup(): Harness {
  const register = vi.fn();
  TestBed.configureTestingModule({
    imports: [RegisterPage],
    providers: [provideRouter([]), { provide: AuthApi, useValue: { register } }],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  return { register, navigate };
}

function fillRequiredFields(fixture: ReturnType<typeof TestBed.createComponent<RegisterPage>>): void {
  setInputValue(fixture, '#register-display-name', 'Ana');
  setInputValue(fixture, '#register-email', 'ana@exemplo.com');
  setInputValue(fixture, '#register-password', 'senha1234');
}

it('TU — mostra erro quando os termos não são aceitos', async () => {
  const { register } = setup();
  const fixture = TestBed.createComponent(RegisterPage);
  fixture.detectChanges();
  fillRequiredFields(fixture);
  submitForm(fixture);
  await fixture.whenStable();
  expect(register).not.toHaveBeenCalled();
});

it('TU — cadastro válido navega para a confirmação de e-mail', async () => {
  const { register, navigate } = setup();
  register.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(RegisterPage);
  fixture.detectChanges();
  fillRequiredFields(fixture);
  clickElement(fixture, 'input[type="checkbox"]');
  submitForm(fixture);
  await fixture.whenStable();
  expect(register).toHaveBeenCalled();
  expect(navigate).toHaveBeenCalledWith(['/confirmar-email'], { queryParams: { email: 'ana@exemplo.com' } });
});

it('TU — erro de validação do servidor mostra as mensagens dos campos', async () => {
  const { register } = setup();
  register.mockRejectedValue(
    new HttpErrorResponse({
      status: 400,
      error: {
        code: 'validation_failed',
        detail: 'x',
        fields: [{ field: 'email', code: 'invalid', message: 'E-mail inválido.' }],
      },
    }),
  );
  const fixture = TestBed.createComponent(RegisterPage);
  fixture.detectChanges();
  fillRequiredFields(fixture);
  clickElement(fixture, 'input[type="checkbox"]');
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('E-mail inválido.');
});

it('TU — o acesso com o Google fica oculto nesta versão', () => {
  setup();
  const fixture = TestBed.createComponent(RegisterPage);
  fixture.detectChanges();
  const html = (fixture.nativeElement as HTMLElement).innerHTML;
  expect(html).not.toContain('Google');
  expect(html).not.toContain('oauth2/authorization');
});
