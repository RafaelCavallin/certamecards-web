import type { Deck } from '../../../core/api/deck.model';
import type { DecksData } from '../../../core/data/decks-data';
import type { DeckFormModel } from '../../../shared/ui/deck-form/deck-content-form';

export async function saveDeckEdit(decksData: DecksData, deck: Deck | undefined, value: DeckFormModel): Promise<void> {
  if (deck === undefined) {
    return;
  }
  await decksData.update(deck.id, {
    subjectId: value.subjectId,
    name: value.name,
    description: value.description === '' ? null : value.description,
  });
}
