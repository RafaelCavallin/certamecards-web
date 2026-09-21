import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { AuthApi } from '../../../core/api/auth-api';
import { AuthStore } from '../../../core/auth/auth-store';
import { setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { GoogleLinkPage } from './google-link-page';

interface Harness {
  readonly linkGoogle: ReturnType<typeof vi.fn>;
  readonly setSession: ReturnType<typeof vi.fn>;
  readonly navigateByUrl: ReturnType<typeof vi.fn>;
}

function setup(): Harness {
  const linkGoogle = vi.fn();
  const setSession = vi.fn();
  TestBed.configureTestingModule({
    imports: [GoogleLinkPage],
    providers: [
      provideRouter([]),
      { provide: AuthApi, useValue: { linkGoogle } },
      { provide: AuthStore, useValue: { setSession } },
      { provide: ActivatedRoute, useValue: { snapshot: { fragment: 'token=link-token' } } },
    ],
  });
  const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { linkGoogle, setSession, navigateByUrl };
}

it('TU — vincula a conta com a senha e o token do fragmento', async () => {
  const { linkGoogle, setSession, navigateByUrl } = setup();
  linkGoogle.mockResolvedValue({
    accessToken: 't',
    expiresIn: 900,
    user: { id: '1', email: 'a@a.com', displayName: 'A', role: 'candidate', termsAccepted: true },
  });
  const fixture = TestBed.createComponent(GoogleLinkPage);
  fixture.detectChanges();
  setInputValue(fixture, '#link-password', 'senha1234');
  submitForm(fixture);
  await fixture.whenStable();
  expect(linkGoogle).toHaveBeenCalledWith({ token: 'link-token', password: 'senha1234' });
  expect(setSession).toHaveBeenCalled();
  expect(navigateByUrl).toHaveBeenCalledWith('/');
});

it('TU — senha incorreta mostra a mensagem de erro', async () => {
  const { linkGoogle } = setup();
  linkGoogle.mockRejectedValue(new HttpErrorResponse({ status: 401, error: { code: 'invalid_credentials', detail: 'x' } }));
  const fixture = TestBed.createComponent(GoogleLinkPage);
  fixture.detectChanges();
  setInputValue(fixture, '#link-password', 'senhaerrada');
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('Senha incorreta');
});
