export interface CardListRow {
  readonly id: string;
  readonly front: string;
  readonly back: string;
  readonly source: string | null;
  readonly dueText: string;
  readonly leech: boolean;
  readonly suspended: boolean;
}
