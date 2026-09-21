import type { CardState } from '../api/card-state.model';

export const LEECH_LAPSE_THRESHOLD = 8;
export function isLeech(state: Pick<CardState, 'lapses'> | null): boolean {
  return (state?.lapses ?? 0) >= LEECH_LAPSE_THRESHOLD;
}
