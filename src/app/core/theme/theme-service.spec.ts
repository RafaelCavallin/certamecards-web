import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it } from 'vitest';
import { waitFor } from '../../testing/dom-testing';
import { SettingsData } from '../data/settings-data';
import { ThemeService } from './theme-service';

afterEach(() => {
  delete document.documentElement.dataset['theme'];
});

it('TU — apply grava o tema Dia no elemento raiz', () => {
  TestBed.configureTestingModule({ providers: [{ provide: SettingsData, useValue: { current: () => undefined } }] });
  const themeService = TestBed.inject(ThemeService);

  themeService.apply('dia');

  expect(document.documentElement.dataset['theme']).toBe('dia');
});

it('TU — apply com Automático remove o atributo, seguindo o sistema', () => {
  TestBed.configureTestingModule({ providers: [{ provide: SettingsData, useValue: { current: () => undefined } }] });
  const themeService = TestBed.inject(ThemeService);
  themeService.apply('dia');

  themeService.apply('auto');

  expect(document.documentElement.dataset['theme']).toBeUndefined();
});

it('TU — ao carregar os ajustes do usuário, aplica o tema salvo', async () => {
  TestBed.configureTestingModule({
    providers: [{ provide: SettingsData, useValue: { current: () => ({ theme: 'noite' }) } }],
  });

  TestBed.inject(ThemeService);

  await waitFor(() => document.documentElement.dataset['theme'] === 'noite');
});
