import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { queryElement } from '../../../testing/dom-testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `<button appButton [variant]="variant" [size]="size">Ação</button>`,
})
class HostComponent {
  variant: 'primary' | 'quiet' | 'ghost' = 'quiet';
  size: 'md' | 'sm' = 'md';
}

it('TU — variante quiet é o padrão', () => {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  expect(queryElement(fixture, 'button')?.className).toContain('bg-surface-raised');
});

it('TU — variante primary usa o fundo âmbar', () => {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.variant = 'primary';
  fixture.detectChanges();
  expect(queryElement(fixture, 'button')?.className).toContain('bg-amber');
});

it('TU — tamanho sm reduz a altura do botão', () => {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.size = 'sm';
  fixture.detectChanges();
  const classes = queryElement(fixture, 'button')?.className;
  expect(classes).toContain('h-11');
  expect(classes).toContain('sm:h-9');
});
