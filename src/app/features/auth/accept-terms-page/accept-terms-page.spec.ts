import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import type { AuthUser } from '../../../core/api/auth.model';
import { AuthStore } from '../../../core/auth/auth-store';
import { clickElement, rootText } from '../../../testing/dom-testing';
import { AcceptTermsPage } from './accept-terms-page';

const CURRENT_USER: AuthUser = { id: '1', email: 'a@a.com', displayName: 'A', role: 'candidate', termsAccepted: false };

interface Harness {
  readonly acceptTerms: ReturnType<typeof vi.fn>;
  readonly updateUser: ReturnType<typeof vi.fn>;
  readonly navigateByUrl: ReturnType<typeof vi.fn>;
}

function setup(): Harness {
  const acceptTerms = vi.fn();
  const updateUser = vi.fn();
  TestBed.configureTestingModule({
    imports: [AcceptTermsPage],
    providers: [
      provideRouter([]),
      { provide: AuthApi, useValue: { acceptTerms } },
      { provide: AuthStore, useValue: { user: () => CURRENT_USER, updateUser } },
    ],
  });
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { acceptTerms, updateUser, navigateByUrl };
}

it('TU — aceitar os termos atualiza o usuário e navega para o painel', async () => {
  const { acceptTerms, updateUser, navigateByUrl } = setup();
  acceptTerms.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(AcceptTermsPage);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  await fixture.whenStable();
  expect(acceptTerms).toHaveBeenCalledWith({ version: '2026-09-01' });
  expect(updateUser).toHaveBeenCalledWith({ ...CURRENT_USER, termsAccepted: true });
  expect(navigateByUrl).toHaveBeenCalledWith('/');
});

it('TU — falha ao aceitar os termos mostra a mensagem de erro', async () => {
  const { acceptTerms } = setup();
  acceptTerms.mockRejectedValue(new Error('boom'));
  const fixture = TestBed.createComponent(AcceptTermsPage);
  fixture.detectChanges();
  clickElement(fixture, 'button');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Não foi possível registrar o aceite');
});
