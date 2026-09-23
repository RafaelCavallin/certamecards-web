export const ACTION_LABELS: Readonly<Record<string, string>> = {
  subject_created: 'Matéria criada',
  subject_renamed: 'Matéria renomeada',
  subject_deactivated: 'Matéria desativada',
  subject_reactivated: 'Matéria reativada',
  admin_granted: 'Administrador concedido',
  admin_revoked: 'Administrador retirado',
  official_deck_created: 'Deck oficial criado',
  official_deck_updated: 'Deck oficial editado',
  official_deck_published: 'Deck oficial publicado',
  official_deck_unpublished: 'Deck oficial voltou para rascunho',
  official_deck_discontinued: 'Deck oficial descontinuado',
  official_deck_deleted: 'Deck oficial excluído',
  official_card_created: 'Cartão oficial criado',
  official_card_updated: 'Cartão oficial corrigido',
  official_card_content_changed: 'Conteúdo de cartão oficial alterado',
  official_card_deleted: 'Cartão oficial excluído',
  error_report_resolved: 'Apontamento resolvido',
  error_report_rejected: 'Apontamento improcedente',
};
export const ACTION_KEYS: readonly string[] = Object.keys(ACTION_LABELS);
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
