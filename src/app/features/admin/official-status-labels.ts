import type { OfficialStatus } from '../../core/api/deck.model';

export const OFFICIAL_STATUS_LABELS: Readonly<Record<OfficialStatus, string>> = {
  draft: 'Rascunho',
  published: 'Publicado',
  discontinued: 'Descontinuado',
};
export const OFFICIAL_STATUSES: readonly OfficialStatus[] = ['draft', 'published', 'discontinued'];
