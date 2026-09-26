import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { rootText } from '../../testing/dom-testing';
import { ConflictCompare } from './conflict-compare';

it('TU — comparação identifica mudanças por texto e estrutura', () => {
  const fixture = TestBed.createComponent(ConflictCompare);
  fixture.componentRef.setInput('detail', {
    id: 'c1', entityType: 'card', entityId: 'card-1', deckId: 'deck-1', reason: 'concurrent_update',
    losingSnapshot: { front: 'Pergunta antiga', back: 'Resposta' }, winningSnapshot: { front: 'Pergunta nova', back: 'Resposta' },
    currentVersion: 2, currentDeleted: false, expiresAt: '2026-10-01T00:00:00Z', restoredAt: null,
  });
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('alterado');
  expect(rootText(fixture)).toContain('Pergunta antiga');
  expect(rootText(fixture)).toContain('Pergunta nova');
});

it('CA-29 — mostra só campos de conteúdo com rótulos em português e títulos das duas versões', () => {
  const fixture = TestBed.createComponent(ConflictCompare);
  fixture.componentRef.setInput('detail', {
    id: 'c1', entityType: 'card', entityId: 'card-1', deckId: 'deck-1', reason: 'concurrent_update',
    losingSnapshot: { front: 'A', back: 'Verso', source: null, parentBaseVersion: null },
    winningSnapshot: { front: 'B', back: 'Verso', source: null, parentBaseVersion: null },
    currentVersion: 2, currentDeleted: false, expiresAt: '2026-10-01T00:00:00Z', restoredAt: null,
  });
  fixture.detectChanges();
  const text = rootText(fixture);
  expect(text).toContain('Versão atual');
  expect(text).toContain('Versão guardada');
  expect(text).toContain('Frente · alterado');
  expect(text).not.toContain('parentBaseVersion');
  expect(text).not.toContain('front');
});

it('CA-18 — quando a exclusão venceu, a versão atual informa que o item continua excluído', () => {
  const fixture = TestBed.createComponent(ConflictCompare);
  fixture.componentRef.setInput('detail', {
    id: 'c1', entityType: 'card', entityId: 'card-1', deckId: 'deck-1', reason: 'delete_wins',
    losingSnapshot: { front: 'Editado', back: 'Verso' }, winningSnapshot: null,
    currentVersion: null, currentDeleted: true, expiresAt: '2026-10-01T00:00:00Z', restoredAt: null,
  });
  fixture.detectChanges();
  expect(rootText(fixture)).toContain('Este item foi excluído e continua excluído.');
  expect(rootText(fixture)).toContain('Editado');
});
