import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { setInputValue, submitForm, textContent } from '../../../testing/dom-testing';
import { expect, it } from 'vitest';
import { anAdmin, setupAdminsPage } from './admins-page-harness';
import { AdminsPage } from './admins-page';

it('lista os administradores', async () => {
  setupAdminsPage([anAdmin({ displayName: 'Ana' })]);
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, 'table')).toContain('Ana');
});

it('concede o papel por e-mail e adiciona à lista', async () => {
  const { grantAdmin } = setupAdminsPage([]);
  grantAdmin.mockResolvedValue(anAdmin({ id: '2', email: 'bruno@exemplo.com', displayName: 'Bruno' }));
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  setInputValue(fixture, '#grant-admin-email', 'bruno@exemplo.com');
  submitForm(fixture, 'form');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(grantAdmin).toHaveBeenCalledWith({ email: 'bruno@exemplo.com' });
  expect(textContent(fixture, 'table')).toContain('Bruno');
});

it('e-mail sem conta mostra a mensagem de erro', async () => {
  const { grantAdmin } = setupAdminsPage([]);
  grantAdmin.mockRejectedValue(new HttpErrorResponse({ status: 404, error: { code: 'not_found', detail: 'x' } }));
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  setInputValue(fixture, '#grant-admin-email', 'ausente@exemplo.com');
  submitForm(fixture, 'form');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('Não encontramos um usuário com esse e-mail.');
});
