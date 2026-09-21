import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { clickElement, queryElement, rootText } from '../../../testing/dom-testing';
import { Flashcard } from './flashcard';

function setup(overrides: Partial<{ revealed: boolean; isNew: boolean; source: string | null }> = {}): ReturnType<typeof TestBed.createComponent<Flashcard>> {
  const fixture = TestBed.createComponent(Flashcard);
  fixture.componentRef.setInput('front', 'Qual o prazo?');
  fixture.componentRef.setInput('back', '120 dias');
  fixture.componentRef.setInput('subject', 'Direito');
  fixture.componentRef.setInput('source', overrides.source ?? 'CF/88, art. 5º');
  fixture.componentRef.setInput('isNew', overrides.isNew ?? false);
  fixture.componentRef.setInput('revealed', overrides.revealed ?? false);
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra a pergunta e o botão de revelar antes de responder', () => {
  const fixture = setup();
  expect(rootText(fixture)).toContain('Qual o prazo?');
  expect(rootText(fixture)).not.toContain('120 dias');
  expect(queryElement(fixture, '#s-reveal')).not.toBeNull();
});

it('TU — mostra a resposta depois de revelado, sem o botão', () => {
  const fixture = setup({ revealed: true });
  expect(rootText(fixture)).toContain('120 dias');
  expect(queryElement(fixture, '#s-reveal')).toBeNull();
});

it('TU — emite reveal ao clicar em Mostrar resposta', () => {
  const fixture = setup();
  let revealed = false;
  fixture.componentInstance.reveal.subscribe(() => (revealed = true));
  clickElement(fixture, '#s-reveal');
  expect(revealed).toBe(true);
});

it('TU — indica cartão novo', () => {
  const fixture = setup({ isNew: true });
  expect(rootText(fixture)).toContain('· novo');
});
