import { HttpErrorResponse } from '@angular/common/http';
import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, queryElement, rootText } from '../../../testing/dom-testing';
import { aPreview, aSummary, libraryProviders } from '../library-test-support';
import type { LibraryMocks } from '../library-test-support';
import { DeckPreviewSheet } from './deck-preview-sheet';

async function setup(online = true, configure?: (mocks: LibraryMocks) => void): Promise<{
  fixture: ReturnType<typeof TestBed.createComponent<DeckPreviewSheet>>;
  mocks: LibraryMocks;
  opened: ReturnType<typeof vi.fn>;
}> {
  const { mocks, providers } = libraryProviders(online);
  configure?.(mocks);
  TestBed.configureTestingModule({ providers: providers as Provider[] });
  const fixture = TestBed.createComponent(DeckPreviewSheet);
  const opened = vi.fn();
  fixture.componentInstance.opened.subscribe(opened);
  fixture.componentRef.setInput('deckId', 'd1');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mocks, opened };
}
function button(fixture: ReturnType<typeof TestBed.createComponent<DeckPreviewSheet>>, text: string): HTMLElement | undefined {
  return queryAll(fixture, 'button').find((candidate) => candidate.textContent?.trim() === text);
}

it('CA-01 — a prévia é um dialog com título e mostra os 10 cartões com frente, verso e fonte', async () => {
  const { fixture } = await setup();
  const dialog = queryElement(fixture, 'dialog');
  expect(dialog?.getAttribute('aria-labelledby')).not.toBeNull();
  expect(queryAll(fixture, 'app-preview-card-list li')).toHaveLength(10);
  expect(rootText(fixture)).toContain('Fonte: CF/88, art. 1º');
  expect(rootText(fixture)).toContain('Verso 3');
});

it('CA-05 — Inscrever-se assina o deck e leva a ele', async () => {
  const { fixture, mocks, opened } = await setup(true, (m) => m.subscriptions.subscribe?.mockResolvedValue(aSummary()));
  button(fixture, 'Inscrever-se')?.click();
  await fixture.whenStable();
  expect(mocks.subscriptions.subscribe).toHaveBeenCalledWith('d1');
  expect(opened).toHaveBeenCalledWith('d1');
});

it('CA-06 — estouro do limite mostra a mensagem com os números e não abre o deck', async () => {
  const limit = new HttpErrorResponse({
    status: 422, error: { status: 422, code: 'user_card_limit', detail: 'x', requiredCards: 30, availableCards: 10 },
  });
  const { fixture, opened } = await setup(true, (m) => m.subscriptions.subscribe?.mockRejectedValue(limit));
  button(fixture, 'Inscrever-se')?.click();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Este deck tem 30 cartões e você só tem espaço para 10');
  expect(opened).not.toHaveBeenCalled();
});

it('CA-01 — deck inscrito mostra "Abrir deck" no lugar de Inscrever-se', async () => {
  const { fixture, opened } = await setup(true, (m) => m.api.preview?.mockResolvedValue(aPreview(aSummary({ subscribed: true }))));
  expect(button(fixture, 'Inscrever-se')).toBeUndefined();
  button(fixture, 'Abrir deck')?.click();
  expect(opened).toHaveBeenCalledWith('d1');
});

it('CA-04 — sem rede a prévia não é pedida e as ações não aparecem', async () => {
  const { fixture, mocks } = await setup(false);
  expect(mocks.api.preview).not.toHaveBeenCalled();
  expect(rootText(fixture)).toContain('Isso precisa de conexão');
  expect(button(fixture, 'Inscrever-se')).toBeUndefined();
});

it('CA-01 — falha ao carregar a prévia mostra alerta', async () => {
  const { fixture } = await setup(true, (m) => m.api.preview?.mockRejectedValue(new Error('x')));
  expect(rootText(fixture)).toContain('Não foi possível carregar a prévia');
});
