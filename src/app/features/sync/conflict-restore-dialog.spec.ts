import { TestBed } from '@angular/core/testing';
import { expect, it, vi } from 'vitest';
import { queryElement } from '../../testing/dom-testing';
import { ConflictRestoreDialog } from './conflict-restore-dialog';

it('TU — exige um deck próprio ao restaurar cartão órfão', () => {
  const fixture = TestBed.createComponent(ConflictRestoreDialog);
  const confirmed = vi.fn();
  fixture.componentInstance.confirmed.subscribe(confirmed);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('isOrphanCard', true);
  fixture.componentRef.setInput('decks', []);
  fixture.detectChanges();
  const button = queryElement(fixture, 'button[appButton]') as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  expect(confirmed).not.toHaveBeenCalled();
});
