import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { clickElement, exists, rootText, setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { DeleteAccountPage } from './delete-account-page';

interface Harness {
  readonly deleteAccount: ReturnType<typeof vi.fn>;
  readonly logout: ReturnType<typeof vi.fn>;
}

function setup(fragment: string | null): Harness {
  const deleteAccount = vi.fn();
  const logout = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [DeleteAccountPage],
    providers: [
      provideRouter([]),
      { provide: AuthApi, useValue: { deleteAccount } },
      { provide: AuthStore, useValue: { logout } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
    ],
  });
  return { deleteAccount, logout };
}

it('TU — pede a senha antes de mostrar a confirmação', () => {
  setup(null);
  const fixture = TestBed.createComponent(DeleteAccountPage);
  fixture.detectChanges();
  expect(exists(fixture, '#delete-password')).toBe(true);
});

it('TU — confirma a exclusão com a senha informada', async () => {
  const { deleteAccount, logout } = setup(null);
  deleteAccount.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(DeleteAccountPage);
  fixture.detectChanges();
  setInputValue(fixture, '#delete-password', 'senha1234');
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button[type="button"]');
  await fixture.whenStable();
  expect(deleteAccount).toHaveBeenCalledWith({ password: 'senha1234', reauthToken: null });
  expect(logout).toHaveBeenCalled();
});

it('TU — com reauthToken no fragmento pula direto para a confirmação', () => {
  setup('reauth=google-token');
  const fixture = TestBed.createComponent(DeleteAccountPage);
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Esta ação não pode ser desfeita');
});

it('TU — senha incorreta mostra a mensagem de erro sem sair da confirmação', async () => {
  const { deleteAccount } = setup(null);
  deleteAccount.mockRejectedValue(new HttpErrorResponse({ status: 401, error: { code: 'invalid_credentials', detail: 'x' } }));
  const fixture = TestBed.createComponent(DeleteAccountPage);
  fixture.detectChanges();
  setInputValue(fixture, '#delete-password', 'senhaerrada');
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button[type="button"]');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('Senha incorreta');
});
