import type { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { aSummary, libraryProviders } from '../library-test-support';
import type { LibraryMocks } from '../library-test-support';
import { DeckPreviewSheet } from './deck-preview-sheet';

type Fixture = ReturnType<typeof TestBed.createComponent<DeckPreviewSheet>>;

async function setup(configure?: (mocks: LibraryMocks) => void): Promise<{
  fixture: Fixture;
  mocks: LibraryMocks;
  opened: ReturnType<typeof vi.fn>;
}> {
  const { mocks, providers } = libraryProviders(true);
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
function button(fixture: Fixture, text: string): HTMLElement | undefined {
  return queryAll(fixture, 'button').find((candidate) => candidate.textContent?.trim() === text);
}

it('TI-58 — levar o progresso e cancelar a inscrição envia as duas opções e leva à cópia', async () => {
  const duplicated = aSummary({ id: 'copy-1' });
  const { fixture, mocks, opened } = await setup((m) => {
    m.api.preview?.mockResolvedValue({ deck: aSummary({ subscribed: true }), cards: [] });
    m.subscriptions.duplicate?.mockResolvedValue(duplicated);
  });
  button(fixture, 'Duplicar como deck próprio')?.click();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('não recebe as atualizações');
  button(fixture, 'Duplicar')?.click();
  await fixture.whenStable();
  expect(mocks.subscriptions.duplicate).toHaveBeenCalledWith('d1', expect.any(String), {
    carryProgress: true, cancelSubscription: true,
  });
  expect(opened).toHaveBeenCalledWith('copy-1');
});

it('TI-58 — falha na duplicação mostra a mensagem dentro do diálogo e mantém a prévia', async () => {
  const { fixture, opened } = await setup((m) => m.subscriptions.duplicate?.mockRejectedValue(new Error('x')));
  button(fixture, 'Duplicar como deck próprio')?.click();
  fixture.detectChanges();
  button(fixture, 'Duplicar')?.click();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Não foi possível concluir a ação');
  expect(opened).not.toHaveBeenCalled();
  button(fixture, 'Cancelar')?.click();
  fixture.detectChanges();
  expect(rootText(fixture)).not.toContain('Não foi possível concluir a ação');
});
