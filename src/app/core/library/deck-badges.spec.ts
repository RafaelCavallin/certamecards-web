import { expect, it } from 'vitest';
import type { Deck } from '../api/deck.model';
import { deckBadges } from './deck-badges';

type BadgeInput = Pick<Deck, 'origin' | 'officialStatus' | 'originLabel'>;
const OWN: BadgeInput = { origin: 'own', officialStatus: null, originLabel: null };

it('TU-36 — deck próprio não tem selo', () => {
  expect(deckBadges(OWN)).toEqual([]);
});

it('TU-36 — deck oficial publicado mostra "Oficial" como texto', () => {
  expect(deckBadges({ ...OWN, origin: 'official_subscription', officialStatus: 'published' })).toEqual(['Oficial']);
});

it('TU-36 — deck oficial descontinuado mostra "Oficial" e "Descontinuado"', () => {
  const badges = deckBadges({ ...OWN, origin: 'official_subscription', officialStatus: 'discontinued' });
  expect(badges).toEqual(['Oficial', 'Descontinuado']);
});

it('TU-36 — cópia de deck oficial mostra "Baseado em [nome]"', () => {
  const badges = deckBadges({ origin: 'official_copy', officialStatus: null, originLabel: 'CF/88' });
  expect(badges).toEqual(['Baseado em CF/88']);
});

it('TU-36 — cópia sem nome de origem não mostra selo', () => {
  expect(deckBadges({ ...OWN, origin: 'official_copy' })).toEqual([]);
});
