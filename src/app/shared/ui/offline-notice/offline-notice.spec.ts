import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../../testing/dom-testing';
import { OfflineNotice } from './offline-notice';

it('TU — não mostra a mensagem quando online', () => {
  const fixture = TestBed.createComponent(OfflineNotice);
  fixture.componentRef.setInput('online', true);
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('');
});

it('TU — mostra "Isso precisa de conexão." quando offline', () => {
  const fixture = TestBed.createComponent(OfflineNotice);
  fixture.componentRef.setInput('online', false);
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('Isso precisa de conexão.');
});
