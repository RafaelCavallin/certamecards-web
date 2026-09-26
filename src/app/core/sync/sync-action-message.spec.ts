import { expect, it } from 'vitest';
import { syncActionMessage } from './sync-action-message';

it('TU — mostra orientação distinta para cada erro permanente', () => {
  expect(syncActionMessage('validation_failed')).toContain('Copie o texto');
  expect(syncActionMessage('auth_required')).toContain('sessão');
  expect(syncActionMessage('quota')).toContain('espaço');
  expect(syncActionMessage('deck_card_limit')).toContain('limite');
  expect(syncActionMessage('not_found')).toContain('não está');
  expect(syncActionMessage('forbidden')).toContain('autorização');
});
