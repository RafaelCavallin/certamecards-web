import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { AdminApi } from '../../../core/api/admin-api';
import type { AdminAuditLog } from '../../../core/api/audit-log.model';
import { AuditLogApi } from '../../../core/api/audit-log-api';
import { queryAll, rootText, waitFor } from '../../../testing/dom-testing';
import { routingMocks } from '../official-test-support';
import { AuditLogPage } from './audit-log-page';

function anEntry(overrides: Partial<AdminAuditLog> = {}): AdminAuditLog {
  return {
    id: 'l1', actorId: 'a1', actorName: 'Rafael', action: 'official_card_content_changed',
    targetType: 'official_card', targetId: 'c1', targetLabel: 'CF/88 · Quais são os fundamentos…',
    changes: { note: { before: null, after: 'Lei nova' } }, createdAt: '2026-09-19T14:05:00Z', ...overrides,
  };
}
async function setup(list: ReturnType<typeof vi.fn>): Promise<ReturnType<typeof TestBed.createComponent<AuditLogPage>>> {
  TestBed.configureTestingModule({
    providers: [
      ...(routingMocks().providers as Provider[]),
      { provide: AuditLogApi, useValue: { list } },
      { provide: AdminApi, useValue: { listAdmins: vi.fn().mockResolvedValue([{ id: 'a1', email: 'r@x.com', displayName: 'Rafael' }]) } },
    ],
  });
  const fixture = TestBed.createComponent(AuditLogPage);
  fixture.detectChanges();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Carregando') === false;
  });
  return fixture;
}
function change(fixture: ReturnType<typeof TestBed.createComponent<AuditLogPage>>, id: string, value: string): void {
  const element = queryAll(fixture, `#${id}`)[0] as HTMLInputElement | HTMLSelectElement;
  element.value = value;
  element.dispatchEvent(new Event('change'));
}

it('CA-24 — mostra ação, alvo, autor, data e as mudanças, sem e-mail e sem ações de editar ou apagar', async () => {
  const fixture = await setup(vi.fn().mockResolvedValue({ items: [anEntry()], nextBefore: null }));
  const text = rootText(fixture) ?? '';
  for (const expected of ['Conteúdo de cartão oficial alterado', 'CF/88 · Quais são os fundamentos…', 'Rafael', '19/09/2026', 'note: vazio → Lei nova']) {
    expect(text).toContain(expected);
  }
  expect(text).not.toContain('@');
  expect(queryAll(fixture, 'main li button')).toHaveLength(0);
});

it('CA-24 — filtros por administrador, ação e período consultam o servidor', async () => {
  const list = vi.fn().mockResolvedValue({ items: [], nextBefore: null });
  const fixture = await setup(list);
  change(fixture, 'log-actor', 'a1');
  change(fixture, 'log-action', 'official_deck_published');
  change(fixture, 'log-from', '2026-09-01');
  change(fixture, 'log-to', '2026-09-30');
  await waitFor(() => list.mock.calls.length >= 5);
  expect(list).toHaveBeenLastCalledWith({
    actorId: 'a1', action: 'official_deck_published', from: '2026-09-01', to: '2026-09-30', before: null,
  });
  expect(rootText(fixture)).toContain('Nenhuma ação registrada neste filtro');
});

it('CA-24 — "Carregar mais" acrescenta a próxima página pelo cursor before', async () => {
  const list = vi.fn()
    .mockResolvedValueOnce({ items: [anEntry()], nextBefore: 'cursor-1' })
    .mockResolvedValue({ items: [anEntry({ id: 'l2', actorName: 'Beatriz' })], nextBefore: null });
  const fixture = await setup(list);
  queryAll(fixture, 'button').find((button) => button.textContent === 'Carregar mais')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Beatriz') === true;
  });
  expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ before: 'cursor-1' }));
  expect(rootText(fixture)).toContain('Rafael');
  expect(queryAll(fixture, 'button').map((button) => button.textContent)).not.toContain('Carregar mais');
});

it('CA-24 — erro mostra alerta e permite tentar de novo', async () => {
  const list = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue({ items: [anEntry()], nextBefore: null });
  const fixture = await setup(list);
  expect(rootText(fixture)).toContain('Não foi possível carregar o registro');
  queryAll(fixture, 'button').find((button) => button.textContent === 'Tentar de novo')?.click();
  await waitFor(() => {
    fixture.detectChanges();
    return rootText(fixture)?.includes('Rafael') === true;
  });
});
