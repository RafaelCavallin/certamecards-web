import { Component, computed, input } from '@angular/core';
import type { ConflictDetail } from '../../core/api/sync.model';

interface SnapshotField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly changed: boolean;
}
const FIELD_LABELS: readonly (readonly [key: string, label: string])[] = [
  ['name', 'Nome'],
  ['description', 'Descrição'],
  ['front', 'Frente'],
  ['back', 'Verso'],
  ['source', 'Fonte'],
];
const EMPTY_VALUE = '(vazio)';
function snapshot(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}
function display(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : EMPTY_VALUE;
}
function fields(own: Readonly<Record<string, unknown>>, other: Readonly<Record<string, unknown>>): readonly SnapshotField[] {
  return FIELD_LABELS.filter(([key]) => key in own || key in other).map(([key, label]) => ({
    key, label, value: display(own[key]), changed: display(own[key]) !== display(other[key]),
  }));
}
@Component({ selector: 'app-conflict-compare', templateUrl: './conflict-compare.html' })
export class ConflictCompare {
  readonly detail = input.required<ConflictDetail>();
  private readonly current = computed(() => snapshot(this.detail().winningSnapshot));
  private readonly saved = computed(() => snapshot(this.detail().losingSnapshot));
  protected readonly currentDeleted = computed(() => this.detail().currentDeleted);
  protected readonly currentFields = computed(() => fields(this.current(), this.saved()));
  protected readonly savedFields = computed(() => fields(this.saved(), this.current()));
}
