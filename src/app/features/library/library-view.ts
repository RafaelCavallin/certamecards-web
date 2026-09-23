import type { LibraryDeckPage } from '../../core/api/library.model';

export type LibraryView = 'loading' | 'offline' | 'error' | 'empty-library' | 'no-results' | 'ready';
export interface LibraryViewInput {
  readonly online: boolean;
  readonly failed: boolean;
  readonly filtering: boolean;
  readonly result: LibraryDeckPage | null;
}
export function resolveLibraryView(input: LibraryViewInput): LibraryView {
  if (!input.online) {
    return 'offline';
  }
  if (input.failed) {
    return 'error';
  }
  if (input.result === null) {
    return 'loading';
  }
  if (input.result.total > 0) {
    return 'ready';
  }
  return input.filtering ? 'no-results' : 'empty-library';
}
