import type { Deck } from '../api/deck.model';

export const BADGE_OFFICIAL = 'Oficial';
export const BADGE_DISCONTINUED = 'Descontinuado';
const BADGE_BASED_ON_PREFIX = 'Baseado em ';
export function deckBadges(deck: Pick<Deck, 'origin' | 'officialStatus' | 'originLabel'>): readonly string[] {
  const badges: string[] = [];
  if (deck.origin === 'official_subscription') {
    badges.push(BADGE_OFFICIAL);
  }
  if (deck.officialStatus === 'discontinued') {
    badges.push(BADGE_DISCONTINUED);
  }
  if (deck.origin === 'official_copy' && deck.originLabel !== null) {
    badges.push(`${BADGE_BASED_ON_PREFIX}${deck.originLabel}`);
  }
  return badges;
}
