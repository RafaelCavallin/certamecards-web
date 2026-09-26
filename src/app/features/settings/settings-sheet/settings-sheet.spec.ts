import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { clickElement, queryElement, setInputValue, submitForm } from '../../../testing/dom-testing';
import { AuthStore } from '../../../core/auth/auth-store';
import { SettingsData } from '../../../core/data/settings-data';
import { ProfileMutationWriter } from '../../../core/sync/profile-mutation-writer';
import { SettingsSheet } from './settings-sheet';

const USER = { id: 'u1', email: 'ana@exemplo.com', displayName: 'Ana', role: 'candidate' as const, termsAccepted: true };
const SETTINGS = {
  userId: 'u1',
  newPerDay: 20,
  reviewsPerDay: 9999,
  focusMinutes: 25,
  examDate: null,
  timeZone: 'America/Sao_Paulo',
  theme: 'noite' as const,
  changeSeq: 1,
};

afterEach(() => {
  delete document.documentElement.dataset['theme'];
});

function setup(): {
  updateSettings: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
  fixture: ReturnType<typeof TestBed.createComponent<SettingsSheet>>;
} {
  const updateSettings = vi.fn().mockResolvedValue({ ...SETTINGS, changeSeq: 2 });
  const execute = vi.fn().mockResolvedValue({ userId: 'u1', displayName: 'Ana Paula', displayNameClock: null });
  const updateUser = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { user: () => USER, updateUser } },
      { provide: SettingsData, useValue: { current: () => SETTINGS, update: updateSettings } },
      { provide: ProfileMutationWriter, useValue: { execute } },
    ],
  });
  const fixture = TestBed.createComponent(SettingsSheet);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  return { updateSettings, execute, updateUser, fixture };
}

it('TU — ao abrir, aplica o tema salvo imediatamente', () => {
  setup();
  expect(document.documentElement.dataset['theme']).toBe('noite');
});

it('TU — trocar a aparência aplica na hora, e Cancelar desfaz', () => {
  const { fixture } = setup();
  const select = queryElement(fixture, '#settings-theme-label + select') as HTMLSelectElement;
  select.value = 'dia';
  select.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  expect(document.documentElement.dataset['theme']).toBe('dia');
  clickElement(fixture, 'button[type="button"]');
  fixture.detectChanges();
  expect(document.documentElement.dataset['theme']).toBe('noite');
});

it('TU — salvar envia os ajustes com o nome preenchido', async () => {
  const { fixture, updateSettings } = setup();
  setInputValue(fixture, '#settings-display-name', 'Ana Paula');
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ newPerDay: 20, theme: 'noite' }));
});

it('TU-77 — salvar com o nome alterado grava o perfil localmente e atualiza a sessão', async () => {
  const { fixture, execute, updateUser } = setup();
  setInputValue(fixture, '#settings-display-name', 'Ana Paula');
  fixture.detectChanges();
  submitForm(fixture);
  await fixture.whenStable();
  expect(execute).toHaveBeenCalledWith({ kind: 'profile_patch', displayName: 'Ana Paula' });
  expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ana Paula' }));
});

it('TU — salvar sem alterar o nome não grava o perfil', async () => {
  const { fixture, execute } = setup();
  submitForm(fixture);
  await fixture.whenStable();
  expect(execute).not.toHaveBeenCalled();
});
