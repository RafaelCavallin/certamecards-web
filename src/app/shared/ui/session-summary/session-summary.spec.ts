import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryAll, rootText } from '../../../testing/dom-testing';
import { SessionSummary } from './session-summary';

function setup(showContinue = false): ReturnType<typeof TestBed.createComponent<SessionSummary>> {
  const fixture = TestBed.createComponent(SessionSummary);
  fixture.componentRef.setInput('title', 'Tudo revisado por hoje');
  fixture.componentRef.setInput('message', 'Volte amanhã.');
  fixture.componentRef.setInput('reviewed', 8);
  fixture.componentRef.setInput('correct', 6);
  fixture.componentRef.setInput('minutes', 12);
  fixture.componentRef.setInput('showContinue', showContinue);
  fixture.detectChanges();
  return fixture;
}

it('TU — mostra os números da sessão e a taxa de acerto calculada', () => {
  const fixture = setup();
  expect(rootText(fixture)).toContain('Tudo revisado por hoje');
  expect(rootText(fixture)).toContain('75%');
});

it('TU — não mostra o botão continuar por padrão, mas mostra quando pedido', () => {
  const withoutContinue = setup(false);
  expect(queryAll(withoutContinue, 'button')).toHaveLength(1);
  const withContinue = setup(true);
  expect(queryAll(withContinue, 'button')).toHaveLength(2);
});

it('TU — emite back e continueStudying', () => {
  const fixture = setup(true);
  let backEmitted = false;
  let continueEmitted = false;
  fixture.componentInstance.back.subscribe(() => (backEmitted = true));
  fixture.componentInstance.continueStudying.subscribe(() => (continueEmitted = true));
  const buttons = queryAll(fixture, 'button');
  buttons[0]?.click();
  buttons[1]?.click();
  expect(backEmitted).toBe(true);
  expect(continueEmitted).toBe(true);
});
