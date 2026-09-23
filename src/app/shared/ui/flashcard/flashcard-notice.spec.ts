import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement } from '../../../testing/dom-testing';
import { Flashcard } from './flashcard';

function setup(notice: string | null): ReturnType<typeof TestBed.createComponent<Flashcard>> {
  const fixture = TestBed.createComponent(Flashcard);
  fixture.componentRef.setInput('front', 'Qual o prazo?');
  fixture.componentRef.setInput('back', '120 dias');
  fixture.componentRef.setInput('notice', notice);
  fixture.detectChanges();
  return fixture;
}

it('CA-12 — mostra o aviso antes da pergunta, dentro do cartão, sem tirar o foco', () => {
  const fixture = setup('Atualizado em 19/09/2026: prazo mudou.');
  const article = queryElement(fixture, 'article');
  const note = queryElement(fixture, '[role="note"]');
  expect(note?.textContent).toContain('Atualizado em 19/09/2026: prazo mudou.');
  expect(article?.contains(note)).toBe(true);
  expect(note?.compareDocumentPosition(queryElement(fixture, 'p.text-xl') as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(document.activeElement).toBe(document.body);
});

it('CA-12 — sem nota não mostra aviso', () => {
  expect(queryElement(setup(null), '[role="note"]')).toBeNull();
});
