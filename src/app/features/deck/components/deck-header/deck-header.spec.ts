import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryAll, rootText } from '../../../../testing/dom-testing';
import { DeckHeader } from './deck-header';

function setup(): ReturnType<typeof TestBed.createComponent<DeckHeader>> {
  const fixture = TestBed.createComponent(DeckHeader);
  fixture.componentRef.setInput('name', 'CF/88');
  fixture.componentRef.setInput('subject', 'Direito Constitucional');
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra o nome e a matéria do deck', () => {
  const fixture = setup();
  const text = rootText(fixture);
  expect(text).toContain('CF/88');
  expect(text).toContain('Direito Constitucional');
});

it('TU — emite edited ao clicar em Editar', () => {
  const fixture = setup();
  const handler = vi.fn();
  fixture.componentInstance.edited.subscribe(handler);
  queryAll(fixture, 'button')[0]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — emite resetProgress ao clicar em Zerar progresso', () => {
  const fixture = setup();
  const handler = vi.fn();
  fixture.componentInstance.resetProgress.subscribe(handler);
  queryAll(fixture, 'button')[1]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — emite deleted ao clicar em Excluir', () => {
  const fixture = setup();
  const handler = vi.fn();
  fixture.componentInstance.deleted.subscribe(handler);
  queryAll(fixture, 'button')[2]?.click();
  expect(handler).toHaveBeenCalledOnce();
});

it('TU — offline desabilita Zerar progresso e mostra o motivo', () => {
  const fixture = setup();
  fixture.componentRef.setInput('online', false);
  fixture.detectChanges();
  expect(queryAll(fixture, 'button')[1]?.hasAttribute('disabled')).toBe(true);
  expect(rootText(fixture)).toContain('Isso precisa de conexão: zerar progresso.');
});
