export class UndoStack<T> {
  private readonly entries: T[] = [];

  constructor(private readonly limit: number) {}

  push(entry: T): void {
    this.entries.push(entry);
    if (this.entries.length > this.limit) {
      this.entries.shift();
    }
  }

  pop(): T | undefined {
    return this.entries.pop();
  }

  get canUndo(): boolean {
    return this.entries.length > 0;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
