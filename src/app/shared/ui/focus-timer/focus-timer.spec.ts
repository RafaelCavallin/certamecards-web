import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { clickElement, rootText } from '../../../testing/dom-testing';
import { FocusTimer } from './focus-timer';

it('TU — mostra o tempo restante em mm:ss', () => {
  const fixture = TestBed.createComponent(FocusTimer);
  fixture.componentRef.setInput('seconds', 90);
  fixture.componentRef.setInput('mode', 'focus');
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('01:30');
  expect(rootText(fixture)).toContain('Foco');
});

it('TU — mostra Bloco concluído sem o relógio quando termina', () => {
  const fixture = TestBed.createComponent(FocusTimer);
  fixture.componentRef.setInput('seconds', 0);
  fixture.componentRef.setInput('mode', 'done');
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Bloco concluído');
  expect(rootText(fixture)).not.toContain('00:00');
});

it('TU — emite pauseToggle ao clicar', () => {
  const fixture = TestBed.createComponent(FocusTimer);
  fixture.componentRef.setInput('seconds', 60);
  fixture.componentRef.setInput('mode', 'pause');
  fixture.detectChanges();
  let toggled = false;
  fixture.componentInstance.pauseToggle.subscribe(() => (toggled = true));
  clickElement(fixture, 'button');
  expect(toggled).toBe(true);
});
