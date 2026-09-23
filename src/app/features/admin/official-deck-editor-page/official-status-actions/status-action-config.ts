import type { OfficialStatus } from '../../../../core/api/deck.model';

export type StatusActionKey = 'publish' | 'draft' | 'discontinue' | 'delete';
export interface StatusActionConfig {
  readonly label: string;
  readonly message: string;
  readonly target: OfficialStatus | null;
}
export const STATUS_ACTIONS: Readonly<Record<StatusActionKey, StatusActionConfig>> = {
  publish: {
    label: 'Publicar',
    message: 'O deck aparece na biblioteca e passa a aceitar inscrições. Precisa de pelo menos 5 cartões.',
    target: 'published',
  },
  draft: {
    label: 'Voltar para rascunho',
    message: 'O deck sai da biblioteca. Só é possível se não houver inscritos ativos.',
    target: 'draft',
  },
  discontinue: {
    label: 'Descontinuar',
    message:
      'O deck sai da biblioteca e não aceita novas inscrições. Quem já está inscrito continua recebendo o deck, com o selo Descontinuado.',
    target: 'discontinued',
  },
  delete: {
    label: 'Excluir deck',
    message: 'O deck e os cartões são excluídos. Só é possível se o deck nunca teve inscritos.',
    target: null,
  },
};
const ACTIONS_BY_STATUS: Readonly<Record<OfficialStatus, readonly StatusActionKey[]>> = {
  draft: ['publish', 'delete'],
  published: ['draft', 'discontinue'],
  discontinued: ['publish'],
};
export function actionsFor(status: OfficialStatus): readonly StatusActionKey[] {
  return ACTIONS_BY_STATUS[status];
}
