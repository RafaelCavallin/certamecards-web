export interface Subject {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly changeSeq: number;
}
