import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecksData } from '../../../core/data/decks-data';
import { SubjectsData } from '../../../core/data/subjects-data';
import { generateUuidV7 } from '../../../core/db/uuid7';
import type { DeckFormModel } from '../../../shared/ui/deck-form/deck-content-form';
import { DeckForm } from '../../../shared/ui/deck-form/deck-form';
import { deckFormErrorMessage } from './deck-form-errors';

@Component({
  selector: 'app-deck-form-page',
  imports: [DeckForm],
  templateUrl: './deck-form-page.html',
})
export class DeckFormPage {
  private readonly decksData = inject(DecksData);
  private readonly router = inject(Router);
  protected readonly subjectsData = inject(SubjectsData);
  protected readonly errorMessage = signal<string | null>(null);

  protected async onSaved(value: DeckFormModel): Promise<void> {
    this.errorMessage.set(null);
    try {
      const created = await this.decksData.create({
        id: generateUuidV7(),
        subjectId: value.subjectId,
        name: value.name,
        description: value.description === '' ? null : value.description,
      });
      await this.router.navigate(['/decks', created.id]);
    } catch (error) {
      this.errorMessage.set(deckFormErrorMessage(error));
    }
  }
}
