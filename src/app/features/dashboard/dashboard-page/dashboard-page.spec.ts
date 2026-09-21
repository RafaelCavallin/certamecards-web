import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { aDeck, setupDashboard } from './dashboard-page-test-support';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T08:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

it('TU-21 — mostra a saudação com o primeiro nome', () => {
  const { fixture } = setupDashboard();
  expect(rootText(fixture)).toContain('Bom dia, Ana');
});

it('TU — mostra o estado vazio sem decks', () => {
  const { fixture } = setupDashboard({ decks: [] });
  expect(rootText(fixture)).toContain('Crie seu primeiro deck');
});

it('TU — mostra a lista de decks quando há pelo menos um', () => {
  const { fixture } = setupDashboard({ decks: [aDeck()], subjects: [{ id: 's1', name: 'Direito', active: true, changeSeq: 1 }] });
  expect(rootText(fixture)).toContain('CF/88');
  expect(rootText(fixture)).not.toContain('Crie seu primeiro deck');
});

it('TU — navega para a criação de deck ao clicar em Novo deck', () => {
  const { fixture, navigate } = setupDashboard({ decks: [] });
  const newDeckButton = queryAll(fixture, 'button').find((button) => button.textContent?.includes('Novo deck'));
  newDeckButton?.click();
  expect(navigate).toHaveBeenCalledWith(['/decks', 'novo']);
});

it('CA-27 — mostra o indicador de sincronização e o botão de sair no painel', () => {
  const { fixture } = setupDashboard();
  expect(rootText(fixture)).toContain('Sincronizado');
  expect(rootText(fixture)).toContain('Sair');
});
