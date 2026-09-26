import type { DeckActions } from '../../deck-page/deck-actions';

export function offlineActionsNote(actions: DeckActions): string {
  const labels: string[] = [];
  if (actions.duplicate) {
    labels.push('duplicar');
  }
  if (actions.cancelSubscription) {
    labels.push('cancelar a inscrição');
  }
  return labels.length === 0 ? '' : `Isso precisa de conexão: ${labels.join(', ')}.`;
}
