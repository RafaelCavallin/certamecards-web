import type { Card } from '../../../../core/api/card.model';
import type { OfficialDecksApi } from '../../../../core/api/official-decks-api';

export async function findCardInDeck(api: OfficialDecksApi, deckId: string, cardId: string): Promise<Card | null> {
  let scanned = 0;
  for (let page = 0; ; page += 1) {
    const result = await api.listCards(deckId, page);
    const found = result.items.find((card) => card.id === cardId);
    scanned += result.items.length;
    if (found !== undefined) {
      return found;
    }
    if (result.items.length === 0 || scanned >= result.total) {
      return null;
    }
  }
}
