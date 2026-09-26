import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, expect, it, vi } from 'vitest';
import { SyncActionResolver } from '../../../core/sync/sync-action-resolver';
import type { SyncActionRequired } from '../../../core/sync/sync-status.model';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { SyncActionItem } from './sync-action-item';

const resolver = { retry: vi.fn(), discard: vi.fn(), affectedCount: vi.fn() };
const LIMIT_ACTION: SyncActionRequired = {
  operationId: 'op-1', kind: 'card_create', code: 'user_card_limit', kindLabel: 'Criar cartão', subject: 'Pergunta',
  copyText: 'Pergunta\n\nResposta', knownCardCount: 50_000,
};
function render(action: SyncActionRequired): ComponentFixture<SyncActionItem> {
  TestBed.configureTestingModule({ providers: [{ provide: SyncActionResolver, useValue: resolver }] });
  const fixture = TestBed.createComponent(SyncActionItem);
  fixture.componentRef.setInput('action', action);
  fixture.detectChanges();
  return fixture;
}
function button(fixture: ComponentFixture<SyncActionItem>, label: string): HTMLButtonElement {
  const found = queryAll(fixture, 'button').find((element) => element.textContent?.trim() === label);
  if (found === undefined) throw new Error(`botão "${label}" não encontrado`);
  return found as HTMLButtonElement;
}
async function settle(fixture: ComponentFixture<SyncActionItem>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}
afterEach(() => {
  vi.restoreAllMocks();
  Object.values(resolver).forEach((mock) => mock.mockReset());
});

it('CA-26 — mostra o objeto, o limite, o total conhecido e as ações de copiar e tentar novamente', () => {
  const fixture = render(LIMIT_ACTION);
  const text = rootText(fixture) ?? '';
  expect(text).toContain('Criar cartão: Pergunta');
  expect(text).toContain('Limite: 50.000 cartões por conta. Neste dispositivo: 50.000 cartões.');
  expect(button(fixture, 'Copiar texto')).toBeDefined();
  expect(button(fixture, 'Tentar novamente')).toBeDefined();
});

it('CA-26 — copiar texto usa a área de transferência e confirma; se falhar, orienta a cópia manual', async () => {
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('negado'));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  const fixture = render(LIMIT_ACTION);
  button(fixture, 'Copiar texto').click();
  await waitFor(() => writeText.mock.calls.length === 1);
  await settle(fixture);
  expect(writeText).toHaveBeenCalledWith('Pergunta\n\nResposta');
  expect(rootText(fixture)).toContain('Texto copiado.');
  button(fixture, 'Copiar texto').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('copie manualmente');
});

it('CA-26 — tentar novamente delega ao resolvedor; falha vira aviso', async () => {
  resolver.retry.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x'));
  const fixture = render(LIMIT_ACTION);
  button(fixture, 'Tentar novamente').click();
  await settle(fixture);
  expect(resolver.retry).toHaveBeenCalledWith('op-1');
  button(fixture, 'Tentar novamente').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('Não foi possível concluir agora.');
});

it('CA-09 — descartar pede confirmação com a quantidade afetada, foca a confirmação e cancelar devolve o foco', async () => {
  resolver.affectedCount.mockResolvedValue(3);
  const fixture = render({ ...LIMIT_ACTION, code: 'validation_failed', knownCardCount: null });
  expect(queryAll(fixture, 'button').some((element) => element.textContent?.trim() === 'Tentar novamente')).toBe(false);
  button(fixture, 'Descartar alteração').click();
  await settle(fixture);
  expect(rootText(fixture)).toContain('3 alterações serão removidas deste dispositivo');
  expect(document.activeElement?.textContent?.trim()).toBe('Descartar 3 alterações');
  button(fixture, 'Cancelar').click();
  await settle(fixture);
  expect(document.activeElement?.textContent?.trim()).toBe('Descartar alteração');
  button(fixture, 'Descartar alteração').click();
  await settle(fixture);
  button(fixture, 'Descartar 3 alterações').click();
  await settle(fixture);
  expect(resolver.discard).toHaveBeenCalledWith('op-1');
});

it('CA-27 — sessão revogada não oferece descarte nem cópia sem texto', () => {
  const fixture = render({ ...LIMIT_ACTION, code: 'auth_required', copyText: null, knownCardCount: null, subject: null });
  expect(rootText(fixture)).toContain('Sua sessão foi revogada');
  expect(queryAll(fixture, 'button')).toHaveLength(0);
});
