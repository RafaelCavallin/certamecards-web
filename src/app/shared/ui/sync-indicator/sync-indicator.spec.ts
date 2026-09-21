import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../../testing/dom-testing';
import { SyncIndicator } from './sync-indicator';

it('TU — mostra "Sincronizado" quando não há pendências', () => {
  const fixture = TestBed.createComponent(SyncIndicator);
  fixture.componentRef.setInput('status', 'synced');
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('Sincronizado');
});

it('TU — mostra a contagem de pendentes', () => {
  const fixture = TestBed.createComponent(SyncIndicator);
  fixture.componentRef.setInput('status', 'pending');
  fixture.componentRef.setInput('pendingCount', 10);
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('10 pendentes');
});

it('TU — mostra "Sem conexão" quando offline', () => {
  const fixture = TestBed.createComponent(SyncIndicator);
  fixture.componentRef.setInput('status', 'offline');
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('Sem conexão');
});

it('TU — mostra "Erro ao sincronizar" quando o envio falha', () => {
  const fixture = TestBed.createComponent(SyncIndicator);
  fixture.componentRef.setInput('status', 'error');
  fixture.detectChanges();
  expect(rootText(fixture)?.trim()).toBe('Erro ao sincronizar');
});
