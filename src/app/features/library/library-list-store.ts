import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { LibraryApi } from '../../core/api/library-api';
import type { LibraryDeckPage, LibrarySubject } from '../../core/api/library.model';
import { ConnectivityStore } from '../../core/connectivity/connectivity-store';
import { LibraryEvents } from '../../core/library/library-events';
import { buildLibraryQuery } from '../../core/library/library-query';
import { resolveLibraryView } from './library-view';

const SEARCH_DEBOUNCE_MS = 200;
@Injectable()
export class LibraryListStore {
  private readonly api = inject(LibraryApi);
  private readonly connectivity = inject(ConnectivityStore);
  private readonly events = inject(LibraryEvents);
  private readonly failed = signal(false);
  private readonly term = signal('');
  private requestId = 0;
  private debounce: ReturnType<typeof setTimeout> | null = null;

  readonly subjectId = signal<string | null>(null);
  readonly page = signal(0);
  readonly result = signal<LibraryDeckPage | null>(null);
  readonly subjects = signal<readonly LibrarySubject[]>([]);
  readonly online = this.connectivity.online;
  readonly filtering = computed(() => this.term().trim() !== '' || this.subjectId() !== null);
  readonly view = computed(() =>
    resolveLibraryView({
      online: this.connectivity.online(),
      failed: this.failed(),
      filtering: this.filtering(),
      result: this.result(),
    }),
  );

  constructor() {
    effect(() => {
      if (this.connectivity.online()) {
        untracked(() => void this.reload());
      }
    });
  }

  setTerm(raw: string): void {
    if (raw === this.term()) {
      return;
    }
    this.term.set(raw);
    this.page.set(0);
    this.scheduleReload();
  }

  selectSubject(subjectId: string | null): void {
    this.subjectId.set(subjectId);
    this.page.set(0);
    void this.reload();
  }

  goToPage(page: number): void {
    this.page.set(page);
    void this.reload();
  }

  clearFilters(): void {
    this.term.set('');
    this.subjectId.set(null);
    this.page.set(0);
    void this.reload();
  }

  async reload(): Promise<void> {
    if (!this.connectivity.online()) {
      return;
    }
    const current = (this.requestId += 1);
    this.failed.set(false);
    try {
      const query = buildLibraryQuery(this.term(), this.subjectId(), this.page());
      const [result, subjects] = await Promise.all([this.api.list(query), this.api.subjects()]);
      if (current === this.requestId) {
        this.result.set(result);
        this.subjects.set(subjects);
        this.events.searched({ term: this.term(), subjectId: this.subjectId(), resultCount: result.total });
      }
    } catch {
      this.failed.set(current === this.requestId);
    }
  }

  private scheduleReload(): void {
    if (this.debounce !== null) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => void this.reload(), SEARCH_DEBOUNCE_MS);
  }
}
