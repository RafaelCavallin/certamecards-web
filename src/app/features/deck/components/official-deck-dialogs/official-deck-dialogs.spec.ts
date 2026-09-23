import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { expect, it, vi } from 'vitest';
import { SubscriptionService } from '../../../../core/library/subscription-service';
import { queryAll, rootText } from '../../../../testing/dom-testing';
import { OfficialDeckDialogs } from './official-deck-dialogs';

function setup(service: Record<string, ReturnType<typeof vi.fn>>): {
  fixture: ReturnType<typeof TestBed.createComponent<OfficialDeckDialogs>>;
  navigate: ReturnType<typeof vi.fn>;
  dismissed: ReturnType<typeof vi.fn>;
} {
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [{ provide: SubscriptionService, useValue: service }, { provide: Router, useValue: { navigate } }],
  });
  const fixture = TestBed.createComponent(OfficialDeckDialogs);
  const dismissed = vi.fn();
  fixture.componentInstance.dismissed.subscribe(dismissed);
  fixture.componentRef.setInput('deckId', 'd1');
  fixture.componentRef.setInput('cancelOpen', true);
  fixture.componentRef.setInput('duplicateOpen', true);
  fixture.detectChanges();
  return { fixture, navigate, dismissed };
}
function click(fixture: ReturnType<typeof setup>['fixture'], text: string): void {
  queryAll(fixture, 'button').find((button) => button.textContent?.trim() === text)?.click();
}

it('CA-09 — o diálogo de cancelamento explica a guarda de 90 dias', () => {
  const { fixture } = setup({});
  expect(rootText(fixture)).toContain('guardado por 90 dias');
});

it('CA-09 — confirmar cancela a inscrição, volta ao painel e dispensa o diálogo', async () => {
  const cancel = vi.fn().mockResolvedValue(undefined);
  const { fixture, navigate, dismissed } = setup({ cancel });
  click(fixture, 'Cancelar inscrição');
  await fixture.whenStable();
  expect(cancel).toHaveBeenCalledWith('d1');
  expect(navigate).toHaveBeenCalledWith(['/']);
  expect(dismissed).toHaveBeenCalled();
});

it('CA-09 — falha ao cancelar mostra o motivo no diálogo e não sai da tela', async () => {
  const cancel = vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 0 }));
  const { fixture, navigate } = setup({ cancel });
  click(fixture, 'Cancelar inscrição');
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Isso precisa de conexão.');
  expect(navigate).not.toHaveBeenCalled();
});

it('CA-14 — duplicar envia as escolhas e leva à cópia', async () => {
  const duplicate = vi.fn().mockResolvedValue({ id: 'copy-1' });
  const { fixture, navigate } = setup({ duplicate });
  click(fixture, 'Duplicar');
  await fixture.whenStable();
  expect(duplicate).toHaveBeenCalledWith('d1', expect.any(String), { carryProgress: true, cancelSubscription: true });
  expect(navigate).toHaveBeenCalledWith(['/decks', 'copy-1']);
});

it('CA-14 — Manter e Cancelar dispensam os diálogos', () => {
  const { fixture, dismissed } = setup({});
  click(fixture, 'Manter');
  click(fixture, 'Cancelar');
  expect(dismissed).toHaveBeenCalledTimes(2);
});
