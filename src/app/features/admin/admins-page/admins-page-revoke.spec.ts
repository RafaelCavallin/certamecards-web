import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { clickElement, textContent } from '../../../testing/dom-testing';
import { expect, it } from 'vitest';
import { anAdmin, setupAdminsPage } from './admins-page-harness';
import { AdminsPage } from './admins-page';

it('retira o papel após confirmar e remove da lista', async () => {
  const { revokeAdmin } = setupAdminsPage([anAdmin({ id: '2', displayName: 'Bruno' })]);
  revokeAdmin.mockResolvedValue(undefined);
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink');
  fixture.detectChanges();
  clickElement(fixture, 'button.text-rate-again');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(revokeAdmin).toHaveBeenCalledWith('2');
  expect(textContent(fixture, 'table')).not.toContain('Bruno');
});

it('cancelar a retirada mantém o administrador na lista', async () => {
  const { revokeAdmin } = setupAdminsPage([anAdmin({ displayName: 'Ana' })]);
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink');
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink-muted');
  fixture.detectChanges();
  expect(revokeAdmin).not.toHaveBeenCalled();
  expect(textContent(fixture, 'table')).toContain('Ana');
});

it('TU-29 — retirar o único administrador mostra a mensagem de erro sem removê-lo da lista', async () => {
  const { revokeAdmin } = setupAdminsPage([anAdmin()]);
  revokeAdmin.mockRejectedValue(new HttpErrorResponse({ status: 422, error: { code: 'last_admin', detail: 'x' } }));
  const fixture = TestBed.createComponent(AdminsPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  clickElement(fixture, 'button.text-ink');
  fixture.detectChanges();
  clickElement(fixture, 'button.text-rate-again');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(textContent(fixture, '[role="alert"][aria-live]')).toContain('único administrador');
  expect(textContent(fixture, 'table')).toContain('Ana');
});
