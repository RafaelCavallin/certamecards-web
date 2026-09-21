import type { Rating } from '../../core/scheduler/scheduler.model';

export interface StudyShortcutHandlers {
  readonly revealed: boolean;
  readonly reveal: () => void;
  readonly rate: (rating: Rating) => void;
  readonly undo: () => void;
  readonly end: () => void;
}
const RATING_BY_KEY: Readonly<Record<string, Rating>> = { '1': 1, '2': 2, '3': 3, '4': 4 };
export function dispatchStudyShortcut(event: KeyboardEvent, handlers: StudyShortcutHandlers): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    handlers.end();
    return;
  }
  if (event.key === 'z' || event.key === 'Z') {
    event.preventDefault();
    handlers.undo();
    return;
  }
  if (!handlers.revealed && (event.key === ' ' || event.key === 'Enter')) {
    event.preventDefault();
    handlers.reveal();
    return;
  }
  if (handlers.revealed && event.key === ' ') {
    event.preventDefault();
    handlers.rate(3);
    return;
  }
  const rating = RATING_BY_KEY[event.key];
  if (handlers.revealed && rating !== undefined) {
    event.preventDefault();
    handlers.rate(rating);
  }
}
